export class Reader @ "xs_fdchan_destructor" {
  constructor(fd) @ "xs_Reader"
  read_netstring() @ "xs_read_netstring";
}

export class Writer @ "xs_fdchan_destructor" {
  constructor(fd) @ "xs_Writer"
	write(...items) @ "xs_file_write";
}
