"""Read-only LAN discovery regression tests, Python standard library only."""
import unittest
from unittest.mock import patch

import nettvakt_agent as agent


class DiscoveryTests(unittest.TestCase):
    def setUp(self):
        agent._SCAN_CURSOR = 0

    def test_own_private_subnet_only_and_bounded_sweep(self):
        with patch.object(agent, "run", return_value="192.168.86.23\n") as command, \
             patch.object(agent, "ping", side_effect=lambda ip: 1.5 if ip == "192.168.86.5" else None) as ping:
            result = agent.discover_lan("192.168.86.1", "en0")
        self.assertEqual(result, [
            {"ip":"192.168.86.5", "mac":"", "name":"", "state":"online",
             "source":"icmp", "latency_ms":1.5}
        ])
        self.assertEqual(ping.call_count, 20)
        self.assertEqual(agent._SCAN_CURSOR, 20)
        command.assert_called_once_with("ipconfig", "getifaddr", "en0", timeout=3)

    def test_no_scan_for_vpn_non_private_or_off_subnet_gateway(self):
        with patch.object(agent, "run", return_value="192.168.86.23\n") as run, \
             patch.object(agent, "ping") as ping:
            self.assertEqual(agent.discover_lan("192.168.86.1", "utun1"), [])
            self.assertEqual(agent.discover_lan("192.168.87.1", "en0"), [])
            self.assertEqual(agent.discover_lan("1.1.1.1", "en0"), [])
            self.assertEqual(agent.discover_lan("192.168.86.1", "en0", enabled=False), [])
            self.assertEqual(agent._SCAN_CURSOR, 0)
            ping.assert_not_called()
            self.assertEqual(run.call_count, 2)


if __name__ == "__main__":
    unittest.main()
