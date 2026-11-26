"""Verify the documented fresh-checkout path, without pre-expanded artifacts."""
import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch
import store

class BootstrapTests(unittest.TestCase):
    def test_compressed_catalog_initializes_nested_runtime_without_mutating_seed(self):
        shipped=store.ROOT/'catalog.sqlite.gz'
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            shutil.copyfile(shipped,root/'catalog.sqlite.gz')
            with patch.object(store,'ROOT',root),patch.dict(os.environ,{'PPT_DB':str(root/'data'/'runtime.sqlite')}):
                store.init()
                store.init()
                with store.connection() as db:
                    self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0],'ok')
                    self.assertEqual(db.execute('SELECT count(*) FROM deck_recipes').fetchone()[0],30)
                    self.assertEqual(db.execute('SELECT count(*) FROM font_discovery').fetchone()[0],2103)
            self.assertFalse((root/'catalog.sqlite').exists())
            self.assertEqual(shipped.read_bytes(),(root/'catalog.sqlite.gz').read_bytes())

if __name__=='__main__':unittest.main()
