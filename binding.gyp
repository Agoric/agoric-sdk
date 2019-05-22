{
  "targets": [
    {
      "target_name": "coss",
      "sources": [ "lib/coss-node.cc" ],
      "libraries": [ "-Wl,-rpath,<!(pwd)/lib", "<!(pwd)/lib/libcoss.so" ]
    }
  ]
}
