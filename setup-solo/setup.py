#!/usr/bin/env python

# run:
#  python3 -mvenv ../ve3
#  ../ve3/bin/pip install wheel
#  ../ve3/bin/pip install --editable .
#  ../ve3/bin/ag-setup-solo

from setuptools import setup
setup(
    name="ag-setup-solo",
    description="provisioning client for Agoric testnet",
    license="MIT",
    package_dir={"": "src"},
    packages=["ag_setup_solo"],
    install_requires=[
        "magic-wormhole",
        "treq",
        ],
    entry_points={
        "console_scripts": [ "ag-setup-solo = ag_setup_solo.main:main" ],
        },
    version="0.0.1",
    )

