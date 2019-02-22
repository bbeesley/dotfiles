'use strict';

var _nuclideUri;

function _load_nuclideUri() {
  return _nuclideUri = _interopRequireDefault(require('../../../modules/nuclide-commons/nuclideUri'));
}

var _HgService;

function _load_HgService() {
  return _HgService = _interopRequireWildcard(require('../lib/HgService'));
}

var _hgUtils;

function _load_hgUtils() {
  return _hgUtils = _interopRequireWildcard(require('../lib/hg-utils'));
}

var _hgConstants;

function _load_hgConstants() {
  return _hgConstants = require('../lib/hg-constants');
}

var _rxjsBundlesRxMinJs = require('rxjs/bundles/Rx.min.js');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const mockOutput = `
[
{
  "command":"rebase",
  "conflicts":[
    {
       "base":{
          "contents": "",
          "exists":true,
          "isexec":false,
          "issymlink":false
       },
       "local":{
          "contents": "t1",
          "exists":true,
          "isexec":false,
          "issymlink":false
       },
       "other":{
          "contents":"t2",
          "exists":true,
          "isexec":false,
          "issymlink":false
       },
       "output":{
          "contents": "\u003c\u003c\u003c\u003c\u003c\u003c\u003c dest:   aeef989d24c2 - asriram: t1\\nt1\\n=======\\nt2\\n\u003e\u003e\u003e\u003e\u003e\u003e\u003e source: 64c253f3c1d7 - asriram: t2\\n",
          "exists":true,
          "isexec":false,
          "issymlink":false,
          "path":"temp1"
       },
       "path":"temp1"
    },
    {
       "base":{
          "contents": "",
          "exists":false,
          "isexec":false,
          "issymlink":false
       },
       "local":{
          "contents": "t1",
          "exists":false,
          "isexec":false,
          "issymlink":false
       },
       "other":{
          "contents":"t2",
          "exists":true,
          "isexec":false,
          "issymlink":false
       },
       "output":{
          "contents": "\u003c\u003c\u003c\u003c\u003c\u003c\u003c dest:   aeef989d24c2 - asriram: t1\\nt1\\n=======\\nt2\\n\u003e\u003e\u003e\u003e\u003e\u003e\u003e source: 64c253f3c1d7 - asriram: t2\\n",
          "exists":true,
          "isexec":false,
          "issymlink":false,
          "path":"temp2"
       },
       "path":"temp2"
    }
  ]
}
]`; /**
     * Copyright (c) 2015-present, Facebook, Inc.
     * All rights reserved.
     *
     * This source code is licensed under the license found in the LICENSE file in
     * the root directory of this source tree.
     *
     *  strict-local
     * @format
     */

describe('HgService', () => {
  const hgService = _HgService || _load_HgService();
  const TEST_WORKING_DIRECTORY = '/Test/Working/Directory/';
  const PATH_1 = (_nuclideUri || _load_nuclideUri()).default.join(TEST_WORKING_DIRECTORY, 'test1.js');
  const PATH_2 = (_nuclideUri || _load_nuclideUri()).default.join(TEST_WORKING_DIRECTORY, 'test2.js');
  function relativize(filePath) {
    return (_nuclideUri || _load_nuclideUri()).default.relative(TEST_WORKING_DIRECTORY, filePath);
  }

  describe('::createBookmark', () => {
    const BOOKMARK_NAME = 'fakey456';
    const BASE_REVISION = 'fakey123';

    it('calls the appropriate `hg` command to add', async () => {
      await (async () => {
        jest.spyOn(_hgUtils || _load_hgUtils(), 'hgAsyncExecute').mockImplementation(() => {});
        await hgService.createBookmark(TEST_WORKING_DIRECTORY, BOOKMARK_NAME);
        expect((_hgUtils || _load_hgUtils()).hgAsyncExecute).toHaveBeenCalledWith(['bookmark', BOOKMARK_NAME], { cwd: TEST_WORKING_DIRECTORY });
      })();
    });

    it('calls the appropriate `hg` command to add with base revision', async () => {
      await (async () => {
        jest.spyOn(_hgUtils || _load_hgUtils(), 'hgAsyncExecute').mockImplementation(() => {});
        await hgService.createBookmark(TEST_WORKING_DIRECTORY, BOOKMARK_NAME, BASE_REVISION);
        expect((_hgUtils || _load_hgUtils()).hgAsyncExecute).toHaveBeenCalledWith(['bookmark', '--rev', BASE_REVISION, BOOKMARK_NAME], { cwd: TEST_WORKING_DIRECTORY });
      })();
    });
  });

  describe('::deleteBookmark', () => {
    const BOOKMARK_NAME = 'fakey456';

    it('calls the appropriate `hg` command to delete', async () => {
      await (async () => {
        jest.spyOn(_hgUtils || _load_hgUtils(), 'hgAsyncExecute').mockImplementation(() => {});
        await hgService.deleteBookmark(TEST_WORKING_DIRECTORY, BOOKMARK_NAME);
        expect((_hgUtils || _load_hgUtils()).hgAsyncExecute).toHaveBeenCalledWith(['bookmarks', '--delete', BOOKMARK_NAME], { cwd: TEST_WORKING_DIRECTORY });
      })();
    });
  });

  describe('::renameBookmark', () => {
    const BOOKMARK_NAME = 'fakey456';

    it('calls the appropriate `hg` command to rename', async () => {
      await (async () => {
        jest.spyOn(_hgUtils || _load_hgUtils(), 'hgAsyncExecute').mockImplementation(() => {});
        await hgService.renameBookmark(TEST_WORKING_DIRECTORY, BOOKMARK_NAME, 'fried-chicken');
        expect((_hgUtils || _load_hgUtils()).hgAsyncExecute).toHaveBeenCalledWith(['bookmarks', '--rename', BOOKMARK_NAME, 'fried-chicken'], { cwd: TEST_WORKING_DIRECTORY });
      })();
    });
  });

  describe('::fetchDiffInfo', () => {
    const mockHgDiffOutput = `diff --git test-test/blah/blah.js test-test/blah/blah.js
    --- test1.js
    +++ test1.js
    @@ -150,1 +150,2 @@
    -hi
    +
    +asdfdf`;

    const expectedDiffInfo = {
      added: 2,
      deleted: 1,
      lineDiffs: [{
        oldStart: 150,
        oldLines: 1,
        newStart: 150,
        newLines: 2
      }]
    };

    it('fetches the unified diff output for the given path.', async () => {
      // Test set up: mock out dependency on hg.
      if (!hgService) {
        throw new Error('Invariant violation: "hgService"');
      }

      jest.spyOn(_hgUtils || _load_hgUtils(), 'hgAsyncExecute').mockImplementation((args, options) => {
        expect(args.pop()).toBe(PATH_1);
        return Promise.resolve({ stdout: mockHgDiffOutput });
      });

      if (!hgService) {
        throw new Error('Invariant violation: "hgService"');
      }

      const pathToDiffInfo = await hgService.fetchDiffInfo(TEST_WORKING_DIRECTORY, [PATH_1]);

      if (!pathToDiffInfo) {
        throw new Error('Invariant violation: "pathToDiffInfo"');
      }

      expect(pathToDiffInfo.size).toBe(1);
      expect(pathToDiffInfo.get(PATH_1)).toEqual(expectedDiffInfo);
    });
  });

  describe('::getConfigValueAsync', () => {
    it('calls `hg config` with the passed key', async () => {
      jest.spyOn(_hgUtils || _load_hgUtils(), 'hgAsyncExecute').mockImplementation((args, options) => {
        expect(args).toEqual(['config', 'committemplate.emptymsg']);
        // Return the Object shape expected by `HgServiceBase`.
        return { stdout: '' };
      });
      await hgService.getConfigValueAsync(TEST_WORKING_DIRECTORY, 'committemplate.emptymsg');
    });

    it('returns `null` on errors', async () => {
      jest.spyOn(_hgUtils || _load_hgUtils(), 'hgAsyncExecute').mockImplementation(() => {
        throw new Error('Something failed');
      });
      const config = await hgService.getConfigValueAsync(TEST_WORKING_DIRECTORY, 'non.existent.config');
      expect(config).toBeNull();
    });
  });

  describe('::rename', () => {
    it('can rename files', async () => {
      let wasCalled = false;
      jest.spyOn(_hgUtils || _load_hgUtils(), 'hgAsyncExecute').mockImplementation((args, options) => {
        expect(args.length).toBe(3);
        expect(args.pop()).toBe('file_2.txt');
        expect(args.pop()).toBe('file_1.txt');
        expect(args.pop()).toBe('rename');
        wasCalled = true;
      });
      await (async () => {
        await hgService.rename(TEST_WORKING_DIRECTORY, ['file_1.txt'], 'file_2.txt');
        expect(wasCalled).toBeTruthy();
      })();
    });
  });

  describe('::remove', () => {
    it('can remove files', async () => {
      let wasCalled = false;
      jest.spyOn(_hgUtils || _load_hgUtils(), 'hgAsyncExecute').mockImplementation((args, options) => {
        expect(args.length).toBe(3);
        expect(args.pop()).toBe('file.txt');
        expect(args.pop()).toBe('-f');
        expect(args.pop()).toBe('remove');
        wasCalled = true;
      });
      await (async () => {
        await hgService.remove(TEST_WORKING_DIRECTORY, ['file.txt']);
        expect(wasCalled).toBeTruthy();
      })();
    });
  });

  describe('::add', () => {
    it('can add files', async () => {
      let wasCalled = false;
      jest.spyOn(_hgUtils || _load_hgUtils(), 'hgAsyncExecute').mockImplementation((args, options) => {
        expect(args.length).toBe(2);
        expect(args.pop()).toBe('file.txt');
        expect(args.pop()).toBe('add');
        wasCalled = true;
      });
      await hgService.add(TEST_WORKING_DIRECTORY, ['file.txt']);
      expect(wasCalled).toBeTruthy();
    });
  });

  describe('::commit|amend', () => {
    const commitMessage = 'foo\n\nbar\nbaz';
    const processMessage = {
      kind: 'stdout',
      data: 'Fake message for testing'
    };
    let committedToHg = false;
    let expectedArgs = null;
    beforeEach(() => {
      expectedArgs = null;
      committedToHg = false;
      jest.spyOn(_hgUtils || _load_hgUtils(), 'hgObserveExecution').mockImplementation((_args, options) => {
        const args = _args;
        expect(expectedArgs).not.toBeNull();
        // eslint-disable-next-line eqeqeq

        if (!(expectedArgs !== null)) {
          throw new Error('Invariant violation: "expectedArgs !== null"');
        }

        expect(args.length).toBe(expectedArgs.length, `\nExpected args: [${expectedArgs.toString()}]\nActual args: [${args.toString()}]`);
        while (args.length > 0) {
          const expectedArg = expectedArgs.pop();
          expect(args.pop()).toBe(expectedArg);
        }
        committedToHg = true;
        return _rxjsBundlesRxMinJs.Observable.of(processMessage);
      });
    });

    describe('::commit', () => {
      it('can commit changes', async () => {
        expectedArgs = ['commit', '-m', commitMessage];
        await (async () => {
          await hgService.commit(TEST_WORKING_DIRECTORY, commitMessage).refCount().toArray().toPromise();
          expect(committedToHg).toBeTruthy();
        })();
      });
    });

    describe('::amend', () => {
      it('can amend changes with a message', async () => {
        expectedArgs = ['amend', '-m', commitMessage];
        await (async () => {
          await hgService.amend(TEST_WORKING_DIRECTORY, commitMessage, (_hgConstants || _load_hgConstants()).AmendMode.CLEAN).refCount().toArray().toPromise();
          expect(committedToHg).toBeTruthy();
        })();
      });

      it('can amend changes without a message', async () => {
        expectedArgs = ['amend'];
        await (async () => {
          await hgService.amend(TEST_WORKING_DIRECTORY, null, (_hgConstants || _load_hgConstants()).AmendMode.CLEAN).refCount().toArray().toPromise();
          expect(committedToHg).toBeTruthy();
        })();
      });

      it('can amend with --rebase & a commit message', async () => {
        expectedArgs = ['amend', '--rebase', '-m', commitMessage];
        await hgService.amend(TEST_WORKING_DIRECTORY, commitMessage, (_hgConstants || _load_hgConstants()).AmendMode.REBASE).refCount().toArray().toPromise();
        // 'Looks like commit did not happen'
        expect(committedToHg).toBeTruthy();
      });

      it('can amend with --fixup', async () => {
        expectedArgs = ['amend', '--fixup'];
        await hgService.amend(TEST_WORKING_DIRECTORY, null, (_hgConstants || _load_hgConstants()).AmendMode.FIXUP).refCount().toArray().toPromise();
        expect(committedToHg).toBeTruthy();
      });
    });
  });

  describe('::fetchMergeConflicts', () => {
    it('fetches rich merge conflict data', async () => {
      let wasCalled = false;
      jest.spyOn(_hgUtils || _load_hgUtils(), 'hgRunCommand').mockImplementation((args, options) => {
        wasCalled = true;
        return _rxjsBundlesRxMinJs.Observable.of(mockOutput);
      });
      const mergeConflictsEnriched = await hgService.fetchMergeConflicts(TEST_WORKING_DIRECTORY).refCount().toPromise();
      expect(wasCalled).toBeTruthy();
      expect(mergeConflictsEnriched).not.toBeNull();

      if (!(mergeConflictsEnriched != null)) {
        throw new Error('Invariant violation: "mergeConflictsEnriched != null"');
      }

      expect(mergeConflictsEnriched.conflicts.length).toBe(2);
      const conflicts = mergeConflictsEnriched.conflicts;
      expect(conflicts[0].status).toBe((_hgConstants || _load_hgConstants()).MergeConflictStatus.BOTH_CHANGED);
      expect(conflicts[1].status).toBe((_hgConstants || _load_hgConstants()).MergeConflictStatus.DELETED_IN_OURS);
    });
  });

  describe('::resolveConflictedFile()', () => {
    beforeEach(() => {
      jest.spyOn(_hgUtils || _load_hgUtils(), 'hgObserveExecution').mockImplementation(path => {
        return _rxjsBundlesRxMinJs.Observable.empty();
      });
    });

    it('calls hg resolve', async () => {
      await hgService.markConflictedFile(TEST_WORKING_DIRECTORY, PATH_1, /* resolved */true).refCount().toArray().toPromise();
      expect((_hgUtils || _load_hgUtils()).hgObserveExecution).toHaveBeenCalledWith(['resolve', '-m', PATH_1], { cwd: TEST_WORKING_DIRECTORY });
    });
  });

  describe('::_checkConflictChange', () => {
    let mergeDirectoryExists;
    let hgRepoSubscriptions;

    beforeEach(() => {
      hgRepoSubscriptions = new (_HgService || _load_HgService()).HgRepositorySubscriptions(TEST_WORKING_DIRECTORY);
      mergeDirectoryExists = false;
      jest.spyOn(hgRepoSubscriptions, '_checkMergeDirectoryExists').mockImplementation(() => {
        return mergeDirectoryExists;
      });
    });

    it("reports no conflicts when the merge directory isn't there", async () => {
      await (async () => {
        mergeDirectoryExists = false;
        await hgRepoSubscriptions._checkConflictChange();
        expect(hgRepoSubscriptions._isInConflict).toBeFalsy();
      })();
    });

    // This is necessary especially when users need to run merge drivers to finish
    it('reports in conflict state even if no files have merge conflicts', async () => {
      mergeDirectoryExists = true;
      await (async () => {
        await hgRepoSubscriptions._checkConflictChange();
        expect(hgRepoSubscriptions._isInConflict).toBeTruthy();
      })();
    });

    it('reports conflicts when merge directory exists + conflicts found', async () => {
      mergeDirectoryExists = true;
      await (async () => {
        await hgRepoSubscriptions._checkConflictChange();
        expect(hgRepoSubscriptions._isInConflict).toBeTruthy();
      })();
    });

    it('exits of conflict state when the merge directory is removed', async () => {
      mergeDirectoryExists = true;
      await (async () => {
        await hgRepoSubscriptions._checkConflictChange();
        expect(hgRepoSubscriptions._isInConflict).toBeTruthy();
        mergeDirectoryExists = false;
        await hgRepoSubscriptions._checkConflictChange();
        expect(hgRepoSubscriptions._isInConflict).toBeFalsy();
      })();
    });
  });

  describe('::_disposeObserver', () => {
    it('should end published observables when disposed', async () => {
      await (async () => {
        const subject = new _rxjsBundlesRxMinJs.Subject();
        const repoSubscriptions = new (_HgService || _load_HgService()).HgRepositorySubscriptions(TEST_WORKING_DIRECTORY);
        repoSubscriptions._lockFilesDidChange = subject;

        const locksObservable = repoSubscriptions.observeLockFilesDidChange().refCount().toArray().toPromise();
        const m1 = new Map([['hello', true]]);
        const m2 = new Map([['goodbye', false]]);
        subject.next(m1);
        subject.next(m2);
        repoSubscriptions.dispose();
        // after disposing, we shouldn't see any more emitted events
        subject.next(m1);
        subject.next(m2);
        // await goes through even though we never called subject.complete()
        const result = await locksObservable;
        expect(result).toEqual([m1, m2]);
      })();
    });
  });
});