import SwiftUI
import CoreBluetooth
import UIKit
import Security

struct Sample: Codable, Identifiable {
    let id: UUID
    let date: Date
    let command: String
    let raw: String
    let value: Double?
}

final class Kdiag: NSObject, ObservableObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    @Published private(set) var status = "Starter Bluetooth"
    @Published private(set) var samples: [Sample] = []
    @Published private(set) var running = false
    private var central: CBCentralManager!
    private var peripheral: CBPeripheral?
    private var tx: CBCharacteristic?
    private var rx: CBCharacteristic?
    private let service = CBUUID(string: "FFF0")
    private let transmit = CBUUID(string: "FFF2")
    private let receive = CBUUID(string: "FFF1")
    private let initCommands = ["ATE0", "ATL0", "ATSP6", "ATSH7E0"]
    private let reads = ["010C", "0105", "010D", "0104", "010B", "0110", "0142", "214C", "2102", "2110", "2111", "2117", "2112", "214F", "2151", "21B0", "21B1", "03"]
    @Published private(set) var bridgeStatus = "Bro ikke konfigurert"
    private var bridge = NativeBridge()
    private var remote: NativeBridge.TaskItem?
    private var inFlightRemote: NativeBridge.TaskItem?
    private var bridgeBusy = false
    private var bridgeGeneration = 0
    private var lastBridgePoll = Date.distantPast
    private var bridgeHello = false

    func configureBridge(_ token: String) {
        guard inFlightRemote == nil, !bridgeBusy else { bridgeStatus = "Vent til aktiv forespørsel er ferdig"; return }
        guard bridge.setToken(token) else { bridgeStatus = "Ugyldig kode eller feil ved sikker lagring"; return }
        bridgeGeneration += 1; bridgeBusy = false; bridgeHello = false; remote = nil
        bridgeStatus = "Bro konfigurert"; lastBridgePoll = .distantPast
    }
    private func pumpBridge() {
        guard running, bridge.configured, !bridgeBusy, remote == nil, inFlightRemote == nil,
              Date().timeIntervalSince(lastBridgePoll) >= 1.5 else { return }
        bridgeBusy = true; lastBridgePoll = Date(); let generation = bridgeGeneration
        bridge.poll(hello: !bridgeHello) { [weak self] result in
            guard let self, self.bridgeGeneration == generation else { return }
            self.bridgeBusy = false
            guard self.running else { return }
            switch result {
            case .success(let task):
                self.bridgeHello = true; self.bridgeStatus = "Bro aktiv"; self.remote = task
            case .failure(let error):
                self.bridgeHello = false; self.bridgeStatus = "Bro: " + error.localizedDescription
            }
        }
    }
    private func finishRemote(_ raw: String, ok: Bool) {
        guard let task = inFlightRemote else { return }
        inFlightRemote = nil
        let generation = bridgeGeneration
        bridgeBusy = true
        bridge.result(task, raw: raw, ok: ok) { [weak self] result in
            guard let self, self.bridgeGeneration == generation else { return }
            self.bridgeBusy = false
            if case .failure(let error) = result { self.bridgeStatus = "Resultat ikke bekreftet: " + error.localizedDescription; self.bridgeHello = false }
        }
    }
    private var initIndex = 0
    private var readIndex = 0
    private var pending: String?
    private var buffer = Data()
    private var timeout: DispatchWorkItem?
    private var next: DispatchWorkItem?
    private var retry: DispatchWorkItem?
    private let defaults = UserDefaults.standard
    private var logURL: URL? {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?
            .appendingPathComponent("SmedOBD-native-log.json")
    }

    override init() {
        super.init()
        running = defaults.bool(forKey: "obd.running")
        if bridge.configured { bridgeStatus = "Bro konfigurert" }
        if let url = logURL, let data = try? Data(contentsOf: url),
           let history = try? JSONDecoder().decode([Sample].self, from: data) {
            samples = history
        }
        central = CBCentralManager(delegate: self, queue: .main, options: [
            CBCentralManagerOptionRestoreIdentifierKey: "no.smed.obd.kdiag.central"
        ])
    }

    func start() {
        running = true
        defaults.set(true, forKey: "obd.running")
        connectOrScan()
    }

    func stop() {
        running = false
        remote = nil; bridgeHello = false
        defaults.set(false, forKey: "obd.running")
        retry?.cancel(); retry = nil
        clearIO()
        central.stopScan()
        if let p = peripheral { central.cancelPeripheralConnection(p) }
        peripheral = nil
        status = "Stoppet"
    }

    private func clearIO() {
        timeout?.cancel(); timeout = nil
        next?.cancel(); next = nil
        if inFlightRemote != nil { finishRemote("Bluetooth avbrutt", ok: false) }
        pending = nil; buffer.removeAll()
        tx = nil; rx = nil
        initIndex = 0; readIndex = 0
    }

    private func connectOrScan() {
        guard running, central.state == .poweredOn else { return }
        if let p = peripheral {
            if p.state == .connected {
                if tx == nil || rx == nil { discover(p) }
            } else if p.state == .disconnected {
                status = "Kobler til KDIAG"
                central.connect(p)
            }
            return
        }
        if let saved = defaults.string(forKey: "obd.peripheral"),
           let id = UUID(uuidString: saved),
           let p = central.retrievePeripherals(withIdentifiers: [id]).first {
            peripheral = p
            p.delegate = self
            connectOrScan()
            return
        }
        status = "Søker etter KONNWEI"
        central.scanForPeripherals(withServices: [service], options: nil)
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn { connectOrScan() }
        else { clearIO(); status = "Bluetooth utilgjengelig (\(central.state.rawValue))" }
    }

    func centralManager(_ central: CBCentralManager, willRestoreState dict: [String: Any]) {
        guard running else {
            for p in dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral] ?? [] {
                central.cancelPeripheralConnection(p)
            }
            return
        }
        if let p = (dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral])?.first {
            peripheral = p; p.delegate = self
            status = "Bluetooth-tilstand gjenopprettet"
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover p: CBPeripheral,
                        advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = (p.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? "").uppercased()
        guard running, peripheral == nil, name.hasPrefix("KONNWEI") || name.hasPrefix("KDIAG") else { return }
        central.stopScan()
        peripheral = p; p.delegate = self
        defaults.set(p.identifier.uuidString, forKey: "obd.peripheral")
        connectOrScan()
    }

    func centralManager(_ central: CBCentralManager, didConnect p: CBPeripheral) {
        guard running, p.identifier == peripheral?.identifier else {
            central.cancelPeripheralConnection(p); return
        }
        retry?.cancel(); retry = nil
        discover(p)
    }

    private func discover(_ p: CBPeripheral) {
        clearIO()
        p.delegate = self
        status = "Finner KDIAG-kanaler"
        p.discoverServices([service])
    }

    private func reconnect(_ p: CBPeripheral, reason: String) {
        guard running, p.identifier == peripheral?.identifier else { return }
        clearIO()
        status = reason + " – gjenoppkobling"
        retry?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.connectOrScan() }
        retry = work
        // Register a pending CoreBluetooth connection even when timers are suspended.
        if p.state == .disconnected, central.state == .poweredOn { central.connect(p) }
        DispatchQueue.main.asyncAfter(deadline: .now() + 4, execute: work)
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect p: CBPeripheral, error: Error?) {
        guard running, p.identifier == peripheral?.identifier else { return }
        clearIO(); status = "Tilkobling feilet – prøver på nytt"
        retry?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.connectOrScan() }
        retry = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 4, execute: work)
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral p: CBPeripheral, error: Error?) {
        reconnect(p, reason: "KDIAG frakoblet")
    }

    private func fail(_ p: CBPeripheral, _ message: String) {
        clearIO(); status = message
        if p.state == .connected || p.state == .connecting {
            central.cancelPeripheralConnection(p)
        } else { reconnect(p, reason: message) }
    }

    func peripheral(_ p: CBPeripheral, didDiscoverServices error: Error?) {
        guard running, p.identifier == peripheral?.identifier else { return }
        guard error == nil, let s = p.services?.first(where: { $0.uuid == service }) else {
            fail(p, "FFF0 mangler"); return
        }
        p.discoverCharacteristics([transmit, receive], for: s)
    }

    func peripheral(_ p: CBPeripheral, didDiscoverCharacteristicsFor s: CBService, error: Error?) {
        guard running, p.identifier == peripheral?.identifier else { return }
        guard error == nil, let cs = s.characteristics,
              let t = cs.first(where: { $0.uuid == transmit }),
              let r = cs.first(where: { $0.uuid == receive }),
              t.properties.contains(.writeWithoutResponse),
              r.properties.contains(.notify) || r.properties.contains(.indicate) else {
            fail(p, "KDIAG-kanaler ikke kompatible"); return
        }
        tx = t; rx = r
        if r.isNotifying { sendNext() } else { p.setNotifyValue(true, for: r) }
    }

    func peripheral(_ p: CBPeripheral, didUpdateNotificationStateFor c: CBCharacteristic, error: Error?) {
        guard running, p.identifier == peripheral?.identifier, c.uuid == receive else { return }
        guard error == nil, c.isNotifying else { fail(p, "Varsler feilet"); return }
        sendNext()
    }

    func peripheralIsReady(toSendWriteWithoutResponse p: CBPeripheral) {
        guard p.identifier == peripheral?.identifier else { return }
        sendNext()
    }

    private func sendNext() {
        guard running, pending == nil, let p = peripheral, p.state == .connected,
              let t = tx, rx?.isNotifying == true, p.canSendWriteWithoutResponse else { return }
        next?.cancel(); next = nil
        let command: String
        if initIndex < initCommands.count { command = initCommands[initIndex] }
        else if let task = remote {
            remote = nil; inFlightRemote = task
            if !reads.contains(task.command) || (task.operation != nil && task.operation != "read") {
                finishRemote("Avvist: bare godkjente lesekommandoer", ok: false)
                command = reads[readIndex % reads.count]
            } else { command = task.command }
        } else { command = reads[readIndex % reads.count] }
        pending = command; buffer.removeAll()
        let work = DispatchWorkItem { [weak self, weak p] in
            guard let self, let p, self.pending == command else { return }
            self.fail(p, "Tidsavbrudd på " + command)
        }
        timeout = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 5, execute: work)
        p.writeValue(Data((command + "\r").utf8), for: t, type: .withoutResponse)
    }

    func peripheral(_ p: CBPeripheral, didUpdateValueFor c: CBCharacteristic, error: Error?) {
        guard running, p.identifier == peripheral?.identifier, c.uuid == receive,
              let command = pending else { return }
        guard error == nil, let value = c.value else { fail(p, "Mottaksfeil"); return }
        buffer.append(value)
        guard buffer.count <= 16384 else { fail(p, "For stort svar"); return }
        guard let end = buffer.firstIndex(of: 62) else { return }
        let raw = String(decoding: buffer.prefix(upTo: end), as: UTF8.self)
        timeout?.cancel(); timeout = nil; pending = nil; buffer.removeAll()
        if initIndex < initCommands.count {
            guard raw.components(separatedBy: .newlines).contains(where: {
                $0.trimmingCharacters(in: .whitespacesAndNewlines).uppercased() == "OK"
            }) else { fail(p, "CAN-oppsett avvist: " + command); return }
            initIndex += 1
            status = initIndex == initCommands.count ? "CAN klar – leser motor" : "Initialiserer CAN"
        } else {
            if inFlightRemote != nil { finishRemote(raw, ok: true) } else { readIndex += 1 }
            let sample = Sample(id: UUID(), date: Date(), command: command, raw: raw, value: Self.decode(command, raw))
            samples.append(sample)
            if samples.count > 5000 { samples.removeFirst(samples.count - 5000) }
            persist()
            pumpBridge()
        }
        // Each BLE response drives the next request; no webview is required.
        // iOS can still suspend or throttle execution. Foreground pacing is deliberate.
        if UIApplication.shared.applicationState == .background {
            sendNext()
        } else {
            let work = DispatchWorkItem { [weak self] in self?.sendNext() }
            next = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.75, execute: work)
        }
    }

    private func persist() {
        guard let url = logURL else { return }
        do {
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            let data = try JSONEncoder().encode(samples)
            try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        } catch { status = "Loggfeil: " + error.localizedDescription }
    }

    static func decode(_ command: String, _ raw: String) -> Double? {
        guard command.count == 4 else { return nil }
        let header = "41" + command.suffix(2)
        for line in raw.components(separatedBy: .newlines) {
            let hex = line.uppercased().filter { !$0.isWhitespace }
            guard hex.hasPrefix(header) else { continue }
            let bytes = Array(hex.dropFirst(4))
            guard bytes.count >= 2, let a = UInt8(String(bytes[0...1]), radix: 16) else { continue }
            let x = Double(a)
            let b = bytes.count >= 4 ? UInt8(String(bytes[2...3]), radix: 16).map(Double.init) : nil
            switch command {
            case "010C": return b.map { (256*x+$0)/4 }
            case "0105": return x-40
            case "0104": return x*100/255
            case "010B", "010D": return x
            case "0110": return b.map { (256*x+$0)/100 }
            case "0142": return b.map { (256*x+$0)/1000 }
            default: return nil
            }
        }
        return nil
    }
}

@main struct SmedOBDNative: App {
    @StateObject private var obd = Kdiag()
    @State private var token = ""
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                List {
                    Section("Bluetooth") {
                        Text(obd.status)
                        Button(obd.running ? "Stopp motorvakt" : "Start motorvakt") {
                            if obd.running { obd.stop() } else { obd.start() }
                        }
                        Text("Kun lesing. Bakgrunnskjøring kan begrenses av iOS.").font(.caption)
                        Text(obd.bridgeStatus)
                        SecureField("Privat enhetskode", text: $token).textInputAutocapitalization(.never).autocorrectionDisabled()
                        Button("Koble til Smed-bro") { obd.configureBridge(token); token = "" }.disabled(token.count < 24)
                    }
                    Section("Siste målinger") {
                        ForEach(Array(obd.samples.suffix(30).reversed())) { sample in
                            VStack(alignment: .leading) {
                                Text(sample.command + " · " + (sample.value.map { String(format: "%.2f", $0) } ?? "Ikke dekodet"))
                                Text(sample.date.formatted() + " · " + sample.raw).font(.caption)
                            }
                        }
                    }
                }
                .navigationTitle("Smed OBD Native")
            }
        }
    }
}

final class NativeBridge {
    struct TaskItem: Decodable {
        let id: String
        let command: String
        let operation: String?
    }
    private struct Next: Decodable { let task: TaskItem? }
    private enum BridgeError: LocalizedError {
        case missingToken, http(Int), invalidResponse
        var errorDescription: String? {
            switch self {
            case .missingToken: return "Enhetskode mangler"
            case .http(let n): return "HTTP \(n)"
            case .invalidResponse: return "Ugyldig svar"
            }
        }
    }
    private let base = URL(string: "https://smed-obd-i2kp.onrender.com")!
    private let session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 8
        config.timeoutIntervalForResource = 12
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        return URLSession(configuration: config)
    }()
    private var token: String?
    private var key: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "no.smed.obd.bridge",
         kSecAttrAccount as String: "device-token"]
    }
    init() {
        var query = key
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        if SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
           let data = result as? Data {
            token = String(data: data, encoding: .utf8)
        }
    }
    var configured: Bool { (token?.count ?? 0) >= 24 }
    func setToken(_ input: String) -> Bool {
        let value = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard value.count >= 24, value.count <= 512, !value.contains(where: { $0.isWhitespace }) else { return false }
        let attributes: [String: Any] = [
            kSecValueData as String: Data(value.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        var status = SecItemUpdate(key as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var insert = key
            for (k, v) in attributes { insert[k] = v }
            status = SecItemAdd(insert as CFDictionary, nil)
        }
        guard status == errSecSuccess else { return false }
        token = value
        return true
    }
    private func request(_ path: String, body: [String: Any]? = nil,
                         completion: @escaping (Result<Data, Error>) -> Void) {
        guard let token else { completion(.failure(BridgeError.missingToken)); return }
        var req = URLRequest(url: base.appendingPathComponent(path))
        req.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body {
            req.httpMethod = "POST"
            do { req.httpBody = try JSONSerialization.data(withJSONObject: body) }
            catch { completion(.failure(error)); return }
        }
        session.dataTask(with: req) { data, response, error in
            let result: Result<Data, Error>
            if let error { result = .failure(error) }
            else if let http = response as? HTTPURLResponse {
                if (200..<300).contains(http.statusCode), let data { result = .success(data) }
                else { result = .failure(BridgeError.http(http.statusCode)) }
            } else { result = .failure(BridgeError.invalidResponse) }
            DispatchQueue.main.async { completion(result) }
        }.resume()
    }
    func poll(hello: Bool, completion: @escaping (Result<TaskItem?, Error>) -> Void) {
        let next: () -> Void = { [weak self] in
            guard let self else { return }
            self.request("device/next") { result in
                completion(result.flatMap { data in
                    Result { try JSONDecoder().decode(Next.self, from: data).task }
                })
            }
        }
        if hello {
            request("device/hello", body: ["device": "KONNWEI KDIAG", "version": "0.32-native-dev"]) { result in
                switch result {
                case .success: next()
                case .failure(let error): completion(.failure(error))
                }
            }
        } else { next() }
    }
    func result(_ task: TaskItem, raw: String, ok: Bool, completion: @escaping (Result<Data, Error>) -> Void) {
        request("device/result", body: ["id": task.id, "ok": ok, "response": raw], completion: completion)
    }
}
