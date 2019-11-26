#!/usr/bin/env python

# run:
#  python3 -mvenv ../ve3
#  ../ve3/bin/pip install wheel
#  ../ve3/bin/pip install --editable .
#  ../ve3/bin/ag-pserver --listen tcp:8001 --controller tcp:localhost:8002

# the provisioning webpage is in html/index.html , edit it in place

from setuptools import setup
import os
setup(
    name="ag-pserver",
    description="provisioning server for Agoric testnet",
    license="MIT",
    package_dir={"": "src"},
    packages=["ag_pserver"],
    package_data={"ag_pserver": ['html/*']},
    install_requires=[
        "twisted[tls]",
        "magic-wormhole",
        "treq",
        ],
    entry_points={
        "console_scripts": [ "ag-pserver = ag_pserver.main:main" ],
        },
    include_package_data=True,
    version="0.0.1",
    )

