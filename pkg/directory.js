//#define GHCJS_NODE 1
//#ifdef GHCJS_NODE
// only works on node.js

#include "HsBaseConfig.h"

#ifdef GHCJS_TRACE_DIRECTORY
function h$logDirectory() { h$log.apply(h$log,arguments); }
#define TRACE_DIRECTORY(args...) h$logDirectory(args)
#else
#define TRACE_DIRECTORY(args...)
#endif

if(typeof module !== 'undefined' && module.exports) {
    var h$fs      = require('fs');
    var h$path    = require('path');
    var h$os      = require('os');
    var h$process = process;
}

function h$directory_setErrno(e) {
  TRACE_DIRECTORY("setErrno: " + e);
  var es = e.toString();
  var getErr = function() {
      if(es.indexOf('ENOTDIR') !== -1)      return CONST_ENOTDIR;
      if(es.indexOf('ENOENT') !== -1)       return CONST_ENOENT;
      if(es.indexOf('EEXIST') !== -1)       return CONST_EEXIST;
      if(es.indexOf('ENETUNREACH') !== -1)  return CONST_EINVAL; // fixme
      if(es.indexOf('EPERM') !== -1)        return CONST_EPERM;
      if(es.indexOf('Bad argument') !== -1) return CONST_ENOENT; // fixme?
      throw ("setErrno not yet implemented: " + e);

  }
  h$errno = getErr();
}

function h$directory_handleErrno(f) {
  try {
    f();
  } catch(e) {
    h$directory_setErrno(e);
    return -1;
  }
  return 0;
}

function h$directory_handleErrnoM1(f) {
  try {
    return f();
  } catch(e) {
    h$directory_setErrno(e);
  }
  return -1;
}


function h$directory_handleErrnoNull(f) {
  try {
    return f();
  } catch(e) {
    h$directory_setErrno(e);
  }
  return null;
}

// get/set permissions for file
// set errno and return -1 on error
// masks: 1 - read
//        2 - write
//        4 - exe
//        8 - search
function h$directory_getPermissions(file) {
  TRACE_DIRECTORY("getPermissions: " + file);
  return h$directory_handleErrnoM1(function() {
    var fs = h$fs.statSync(file);
    var m = fs.mode;
    var r = (m&4) || (m&32) || (m&256);
    var w = (m&2) || (m&16) || (m&128);
    var x = (m&1) || (m&8)  || (m&64);
    var exe    = x; // fixme?
    var search = x; // fixme?
    return ((r?1:0)|(w?2:0)|(exe?4:0)|(search?8:0));
  });
}

function h$directory_setPermissions(file, perms) {
  TRACE_DIRECTORY("setPermissions: " + file + " " + perms);
  return h$directory_handleErrno(function() {
    var fs = h$fs.statSync(file);
    var r = perms & 1;
    var w = perms & 2;
    var x = perms & 4;
    var search = perms & 8;
    var m  = fs.mode;
    m = r ? (m | 292) : (m & ~292);
    m = w ? (m | 146) : (m & ~146);
    m = (x || search) ? (m | 73) : (m & ~73);
    h$fs.chmodSync(file, m);
  });
}

function h$directory_copyPermissions(file1, file2) {
  TRACE_DIRECTORY("copyPermissions: " + file1 + " " + file2);
  return h$directory_handleErrno(function() {
    var fs = h$fs.statSync(file1);
    h$fs.chmodSync(file2, fs.mode);
  });
}


function h$directory_createDirectory(dir) {
  TRACE_DIRECTORY("createDirectory: " + dir);
  return h$directory_handleErrno(function() {
    h$fs.mkdirSync(dir);
  });
}

function h$directory_removeDirectory(dir) {
  TRACE_DIRECTORY("removeDirectory: " + dir);
  return h$directory_handleErrno(function() {
    h$fs.rmdirSync(dir);
  });
}

function h$directory_removeFile(file) {
  TRACE_DIRECTORY("removeFile: " + file);
  return h$directory_handleErrno(function() {
    h$fs.unlinkSync(file);
  });
}

function h$directory_renameDirectory(dir1, dir2) {
  TRACE_DIRECTORY("renameDirectory: " + dir1 + " " + dir2);
  return h$directory_handleErrno(function() {
    h$fs.renameSync(dir1, dir2);
  });
}

function h$directory_renameFile(file1, file2) {
  TRACE_DIRECTORY("renameFile: " + file1 + " " + file2);
  return h$directory_handleErrno(function() {
    h$fs.renameSync(file1, file2);
  });
}

function h$directory_canonicalizePath(path) {
  TRACE_DIRECTORY("canonicalizePath: " + path);
  return h$path.normalize(path);
}

function h$directory_findExecutables(name) {
  TRACE_DIRECTORY("findExecutables: " + name);
  var result = [];
  var parts = h$process.env.PATH.split((h$os.platform() === 'windows')?';':':');
  for(var i=0;i<parts.length;i++) {
    try {
      var file = parts[i] + h$path.sep + name;
      TRACE_DIRECTORY("trying: " + file);
      var fs   = h$fs.statSync(file);
      if((fs.mode & 73) || h$os.platform() === 'windows') result.push(file);
    } catch(e) { }
  }
  return result;
}

function h$directory_getDirectoryContents(dir) {
  TRACE_DIRECTORY("getDirectoryContents: " + dir);
  return h$directory_handleErrnoNull(function() {
    return h$fs.readdirSync(dir);
  });
}

function h$directory_getCurrentDirectory() {
  TRACE_DIRECTORY("getCurrentDirectory");
  return h$directory_handleErrnoNull(function() {
    return h$process.cwd();
  });
}

function h$directory_setCurrentDirectory(dir) {
  TRACE_DIRECTORY("setCurrentDirectory: " + dir);
  return h$directory_handleErrno(function() {
    return h$process.chdir(dir);
  });
}

function h$directory_getHomeDirectory(dir) {
  TRACE_DIRECTORY("getHomeDirectory: " + dir);
  return h$process.env.HOME ||
         h$process.env.HOMEPATH ||
         h$process.env.USERPROFILE;
}

function h$directory_getAppUserDataDirectory(appName) {
    TRACE_DIRECTORY("getAppUserDataDirectory: " + appName);
    if(process.env.APPDATA)
        return h$process.env.APPDATA + h$path.sep + appName;
    if(process.env.HOME)
        return h$process.env.HOME + h$path.sep + "." + appName;
    TRACE_DIRECTORY("getAppUserDataDirectory fallback");
    return "/";
}

function h$directory_getTemporaryDirectory() {
  TRACE_DIRECTORY("getTemporaryDirectory");
  return h$directory_handleErrnoNull(function() {
    return h$os.tmpdir();
  });
}

function h$directory_exeExtension() {
  TRACE_DIRECTORY("exeExtension");
  return (h$os.platform() === 'windows') ? 'exe' : '';
}

function h$directory_getFileStatus(file) {
  TRACE_DIRECTORY("getFileStatus: " + file);
  return h$directory_handleErrnoNull(function() {
    return h$fs.statSync(file);
  });
}

function h$directory_getFileOrSymlinkStatus(file) {
    TRACE_DIRECTORY("getFileOrSymlinkStatus: " + file);
    return h$directory_handleErrnoNull(function() {
        return h$fs.lstatSync(file);
    });
}

function h$directory_getFileStatusModificationTime(fs) {
    TRACE_DIRECTORY("getFileStatusModificationTime: " + fs.mtime.getTime());
    return fs.mtime.getTime();
}

function h$directory_getFileStatusIsDirectory(fs) {
  TRACE_DIRECTORY("getFileStatusIsDirectory: " + fs + " " + fs.isDirectory());
  return fs.isDirectory();
}

// fixme this doesn't really belong here
function h$chmod(path_d, path_o, m) {
    var path = h$decodeUtf8z(path_d, path_o);
    TRACE_DIRECTORY("chmod: " + path + " mode: " + m);
    h$fs.chmodSync(path, m);
    return 0;
}

//#endif

