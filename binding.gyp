{
  "targets": [
    {
      "target_name": "coss",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "xcode_settings": {
        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
        'CLANG_CXX_LIBRARY': 'libc++',
        'MACOSX_DEPLOYMENT_TARGET': '10.7',
      },
      "msvs_settings": {
        "VCCLCompilerTool": { "ExceptionHandling": 1 },
      },
      "sources": [ "lib/coss-node.cc" ],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      "libraries": [ "-Wl,-rpath,<!(pwd)/lib", "<!(pwd)/lib/libcoss.so" ]
    },
  ],
#  ['OS=="mac"', {
#    'cflags+': ['-fvisibility=hidden'],
#    'xcode_settings': {
#      'GCC_SYMBOLS_PRIVATE_EXTERN': 'YES', # -fvisibility=hidden
#    }
#  }]
}
