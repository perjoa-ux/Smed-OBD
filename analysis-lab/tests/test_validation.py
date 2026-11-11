import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('analyze', Path(__file__).resolve().parents[1] / 'scripts/analyze.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Validation(unittest.TestCase):
    def test_target_boundary(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            demo = root / 'targets/demo'
            demo.mkdir(parents=True)
            (demo / 'index.js').write_text('throw new Error("never run");')
            request = dict(target='targets/demo', authorized=True, public_ok=True, question='Modules?')
            self.assertEqual(len(module.validate(request, root)[1]), 1)
            for target in ['../outside', '/tmp', 'targets/../scripts']:
                with self.assertRaises(ValueError):
                    module.validate(dict(request, target=target), root)
            with self.assertRaises(ValueError):
                module.validate(dict(request, public_ok=False), root)
            (demo / 'outside.js').symlink_to(root / 'outside.js')
            with self.assertRaises(ValueError):
                module.validate(request, root)


if __name__ == '__main__':
    unittest.main()
