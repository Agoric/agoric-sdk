/**
 * ref Netstrings 19970201 by Bernstein
 * https://cr.yp.to/proto/netstrings.txt
 *
 * Moddable in C
 * https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/xs/XS%20in%20C.md
 *
 * stdio
 * https://pubs.opengroup.org/onlinepubs/009695399/basedefs/stdio.h.html
 */

#include <assert.h>
#include <stdio.h>

#include "xsAll.h"
#include "xs.h"

void xs_Reader(xsMachine *the) {
  int argc = xsToInteger(xsArgc);
  if (argc < 1) {
    mxTypeError("expected fd");
  }
  int fd = xsToInteger(xsArg(0));
  FILE *inStream = fdopen(fd, "rb");
  if (!inStream) {
    mxUnknownError("fdopen failed");
  }
	xsSetHostData(xsThis, (void *)((uintptr_t)inStream));

	// modInstrumentationAdjust(Files, +1);
}

void xs_Writer(xsMachine *the) {
  int argc = xsToInteger(xsArgc);
  if (argc < 1) {
    mxTypeError("expected fd");
  }
  int fd = xsToInteger(xsArg(0));
  FILE *outStream = fdopen(fd, "wb");
  if (!outStream) {
    mxUnknownError("fdopen failed");
  }
	xsSetHostData(xsThis, (void *)((uintptr_t)outStream));

	// modInstrumentationAdjust(Files, +1);
}

void xs_read_netstring(xsMachine *the) {
  size_t len;
  char* buf = NULL;
  FILE *inStream = xsGetHostData(xsThis);
  assert(inStream);

  if (fscanf(inStream, "%9lu", &len) < 1) { goto BARF; }  /* >999999999 bytes is bad */
  // fprintf(stderr, "xs_stdin_read_netstring len %lu\n", len);
  if (fgetc(inStream) != ':') { goto BARF; }
  buf = malloc(len + 1);       /* malloc(0) is not portable */
  if (!buf) { goto BARF; }
  if (fread(buf, 1, len, inStream) < len) { goto BARF; }
  if (fgetc(inStream) != ',') { goto BARF; }

  xsResult = xsStringBuffer(buf, len);
  free(buf);
  // fprintf(stderr, "xs_stdin_read_nestring return\n");
  return;

BARF:
  free(buf);
  xsUnknownError("getline failed");
}

void xs_fdchan_destructor() {

}
