## Changes to the Swingset launch API

The API for configuring and launching a swingset has changed, and along with it the API
for defining a vat and the flow of the Swingset bootstrap process has changed was well.
All existing code that uses the old APIs has been updated, so there should be no remedial
action necessary on your part, but if you continue using the old API in new code you will
be unhappy.

### New config object

Swingsets are now defined by a new form of config object.  The new form is intended to be
pure JSON-serializable data so that it can be saved in a file, transmitted in a message
over the network, and so on.  The new config format is documented in [issue
#1331](https://github.com/Agoric/agoric-sdk/issues/1331) in the `agoric-sdk` repository
(though be forewarned that this spec is still a work in progress since the intention is
to eventually support the data-driven definition of devices also, and you cannot yet do
that -- you still have to define devices in the old way; however, mostly you never do
that so the matter is not yet pressing).

The old config form mixed levels of abstraction, comingling static information defining a
swingset's vats with loading and execution parameters that vary at run time.  These
concerns have now been separated.

### Changes to `buildVatController`

The signature for the Swingset controller's `buildVatController` function is now:

`buildVatController(config, argv = [], runtimeOptions = {})`

The `config` and `argv` parameters are in the same positions, as before but `config` is
now the new form config object.  The `runtimeOptions` parameter is new.

The supported `runtimeOptions` are:

- `hostStorage` : a storage object for the kernel to use

- `verbose` : a boolean flag that controls whether the Swingset kernel will log verbose
  diagnostic messages to the console.
  
Note that both of these properties had previously been attached to the old config object.
While the means by which they get passed to the controller has changed, their meanings
and defaults have not.

The Swingset controller's `loadBasedir` function, which scans a directory for vat source
files obeying a set of naming conventions, still works as before, but now returns the new
form config object.

### Changes to `buildRootObject`

When you define a vat, you write module that exports a `buildRootObject` function.  The
signature of this function has changed.  It is now:

`buildRootObject(vatPowers, vatParameters)`

The `vatPowers` parameter is the same as it was before, while the `vatParameters` parameter
is new.  The latter contains a copy of the contents of the `parameters` property (if there
was one) from the associated vat definition in the config object used to create the
swingset; this allows you to use the config object to configure individual vats however
you like, as long as this configuration can be described by a JSON-serializable pure data
object.  Some demos and tests use multiple instances of the same vat code and had to
resort to weird wrapper modules to allow them to be multiply instantiated; with
`vatParameters` such hackery is no longer required.

In addition, command line parameters from the host invocation of the swingset (which the
host provides in the second parameter to `buildVatController`) are now passed as the
`argv` property of the `vatParameters` rather than as an argument to the bootstrap vat's
`bootstrap` message.  The signature of the `bootstrap` method of the bootstrap vat is
thus now:

`bootstrap(vats, devices)`

Note that the former `argv` parameter has been removed (the `vats` and `devices`
parameters are unchanged).

This relocation of the `argv` information allows the construction of the root object to
be parameterized by command line flags.  Removing it from the `bootstrap` method makes it
clear that the command line arguments don't change even if a vat is replayed by a host
invoked with different command line arguments.

### Where vat code comes from

Previously you described a vat's code by a configuration property giving the path to the
source file containing its `buildRootObject` function.  This option is still available
(and indeed is still the primary way we tend to specify vats).  However, you can also
specify a vat by providing the path to a pre-bundled bundle file or by providing the text
of a bundle directly.  More importantly, the config object allows you to specify bundles
in a separate `bundles` property and then reference these by name inside the vat
descriptions found in the `vats` property.  This means that you can have multiple vats
that reference the same bundle and only load the bundle into memory once.  Moreover, you
can define named bundles that are not initially defined in any vat but which can be
referenced later when creating dynamic vats.  The vat admin service has been augmented
with an additional method `createVatByName` which works like the existing `createVat` method
but indicates the vat by naming it rather than by passing its bundle source directly.
This will decrease both the volume of message traffic and the volume of crud found in vat
transcripts and log files (eventually we may add a feature to allow you to make use of
the kernel's registry of named bundles for things other than vats, but that's for the
future).

### Enhancements to `swingset-runner`

The `swingset-runner` application has been augmented to exploit these new features.
There are a few new command line parameters:

- `--config PATH` -- Will read the swingset definition from a (new form) config object
  from the JSON text file pointed to by `PATH`, instead of inferring it from looking at
  the contents of a directory.  This means, among other things, that you can have
  multiple different swingsets made up from stuff in a single directory, which will be
  particularly useful for testing.
  
- `--indirect` -- Instead of loading the configured swingset and booting it, it will
  instead load a special vat launching vat of its own and pass it the config object.
  This vat will in turn dynamically create all the configured vats itself and send the
  configured bootstrap vat the `bootstrap` message.  This allows us to exercise the
  dynamic vat machinery, but more importantly allows statically defined swingsets to be
  run with metering turned on.
  
- `--meter` -- Will cause such an indirectly loaded swingset to be metered.
