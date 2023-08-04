# State-sync

## Creating Snapshot

```mermaid
sequenceDiagram
  box whitesmoke Main goroutine
    participant TM as Tendermint
    participant A-M as App
    participant MS-M as MultiStore
    participant SSES-M as SwingSet ExtensionSnapshotter
  end

  box whitesmoke App snapshot goroutine
    participant SSES-AS as SwingSet ExtensionSnapshotter
    participant A-AS as App
    participant SM-AS as Snapshot manager
  end

  box whitesmoke Cosmos snapshot goroutine
    participant SM-CS as Snapshot manager
    participant MS-CS as MultiStore
    participant SSES-CS as SwingSet ExtensionSnapshotter
    participant D-CS as Disk
  end

  box whitesmoke JS Main process
    participant CM as Chain Main
    participant D as Disk
  end

  box whitesmoke JS Export process
    participant SSE as SwingStoreExport 
    participant Exporter as Exporter 
    participant D-E as Disk
  end

  TM->>+A-M: Commit
  A-M->>+SSES-M: WaitUntilSwingStoreExportStarted()
  SSES-M-->>-A-M: 
  A-M->>+CM: COMMIT_BLOCK
  CM->>CM: swingStore.commit()
  CM-->>-A-M: 
  A-M->>A-M: BaseApp.CommitWithoutSnapshot()
  A-M->>+CM: AFTER_COMMIT_BLOCK
  CM-->>-A-M: 
  A-M->>A-M: isSnapshotHeight: false
  A-M-->>-TM: 

  TM->>+A-M: BeginBlock
  A-M->>+CM: BEGIN_BLOCK
  CM-->>-A-M: 
  A-M-->>-TM: 

  TM->>+A-M: EndBlock
  A-M->>+CM: END_BLOCK
  CM->>CM: runKernel()
  CM-)A-M: vstorage->setWithoutNotify(prefixedExportDataEntries)
  loop each data entry
    A-M->>+MS-M: vstorage.SetStorage()
    MS-M-->>-A-M: 
  end
  CM-->>-A-M: 
  A-M-->>-TM: 

  TM->>+A-M: Commit
  A-M->>+SSES-M: WaitUntilSwingStoreExportStarted()
  SSES-M-->>-A-M: 
  A-M->>+CM: COMMIT_BLOCK
  CM->>CM: swingStore.commit()
  CM-->>-A-M: 
  A-M->>A-M: BaseApp.CommitWithoutSnapshot()
  A-M->>+CM: AFTER_COMMIT_BLOCK
  CM-->>-A-M: 
  A-M->>A-M: isSnapshotHeight: true
  A-M->>+SSES-M: InitiateSnapshot()
  SSES-M->>SSES-M: checkNotActive()
  SSES-M->>SSES-M: activeOperation = operationDetails{}
  SSES-M-)+SSES-AS: go
  SSES-M-->>-A-M: 
  A-M-->>-TM: 

  par App Snapshot
    SSES-AS->>+CM: SWING_STORE_EXPORT/initiate
    CM->>+D: MkDir(exportDir)
    D-->>-CM: 
    CM-)+SSE: initiateSwingStoreExport(exportDir)
    CM->>CM: await started<br/>(blocking)
    CM-->>-SSES-AS: 
    alt not initiated
      SSES-AS-)SSES-M: exportStartedResult <- err<br/>close(exportStartedResult)
      SSES-AS-)SSES-M: exportDone <- err
    else initiated
    SSES-AS-)SSES-M: close(exportStartedResult)
    alt retrieval
    SSES-AS->>+A-AS: BaseApp.Snapshot()
    A-AS->>+SM-AS: Create()
    SM-AS-)+SM-CS: go createSnapshot()
    SM-CS->>+MS-CS: Snapshot()
    loop each IAVL node
      MS-CS->>+SM-CS: WriteMsg()
      SM-CS-)SM-AS: chunks <- chunk
      SM-CS-->>-MS-CS: 
    end
    MS-CS-->>-SM-CS: 
    SM-CS->>+SSES-CS: SnapshotExtension()
    SSES-CS->>+CM: SWING_STORE_EXPORT/retrieve
    CM->>CM: await done<br/>(blocking)
    CM-->>-SSES-CS: exportDir
    SSES-CS->>+D-CS: Read(export-manifest.json)
    D-CS-->>-SSES-CS: 
    loop
      SSES-CS->>+D-CS: Read(artifactFile)
      D-CS-->>-SSES-CS: 
      SSES-CS->>+SM-CS: payloadWriter(artifact{name, data})
      SM-CS-)SM-AS: chunks <- chunk
      SM-CS-->>-SSES-CS: 
    end
    SSES-CS->>+D-CS: Delete(exportDir)
    D-CS-->>-SSES-CS: 
    SSES-CS-->>-SM-CS: 
    SM-CS-)-SM-AS: close(chunks)
    SM-AS->>SM-AS: Save()
    SM-AS-->>-A-AS: 
    A-AS-->>-SSES-AS: 
    else no retrieval
      SSES-AS->>+A-AS: BaseApp.Snapshot()
      A-AS-->>-SSES-AS: 
      SSES-AS->>+CM: SWING_STORE_EXPORT/discard
      CM-)SSE: Stop()
      SSE-)CM: done::reject()
      CM->>CM: await done
      CM->>+D: Delete(exportDir)
      D-->-CM: 
      CM-->>-SSES-AS: 
      SSES-AS-)SSES-M: exportDone <- err
    end
    end
    SSES-AS-)SSES-M: close(exportDone)
    deactivate SSES-AS
  end

  par JS SwingStore export
    SSE->>Exporter: makeExporter()
    Exporter->>SSE: 
    SSE-)CM: started::resolve()
    opt Export Data, not used in state-sync
    SSE->>Exporter: getExportData()
    Exporter-)SSE: export data iterator
    loop each data entry
      SSE->>+D-E: Append(export-data.jsonl, "JSON(entry tuple)\n")
      D-E-->>-SSE: 
    end
    end
    SSE->>Exporter: getArtifactNames()
    Exporter--)SSE: names async iterator
    loop each artifact name
      SSE->>Exporter: getArtifact(name)
      Exporter--)SSE: artifactStream
      SSE->>+D-E: Write(name, artifactStream)
      D-E-->>-SSE: 
    end
    SSE->>+D-E: Write(export-manifest.jsonl, manifest)
    D-E-->>-SSE: 
    SSE-)CM: done::resolve()
    deactivate SSE
  end

  Note over TM, A-M: BeginBlock, EndBlock

  TM->>+A-M: Commit
  A-M->>+SSES-M: WaitUntilSwingStoreExportStarted()
  SSES-M->>SSES-M: err = <-exportStartedResult<br/>(blocking)
  SSES-M-->>-A-M: 
  A-M->>+CM: COMMIT_BLOCK
  CM->>CM: await started<br/>(blocking)
  CM->>CM: swingStore.commit()
  CM-->>-A-M: 
  A-M->>A-M: BaseApp.CommitWithoutSnapshot()
  A-M->>+CM: AFTER_COMMIT_BLOCK
  CM-->>-A-M: 
  A-M->>A-M: isSnapshotHeight: false
  A-M-->>-TM: 
```

## Restoring Snapshot

```mermaid
sequenceDiagram
  box whitesmoke Main goroutine
    participant TM as Tendermint
    participant A-M as BaseApp
    participant SM-M as Snapshot Manager
  end

  box whitesmoke Cosmos snapshot goroutine
    participant SM-CS as Snapshot manager
    participant MS-CS as MultiStore
    participant SSES-CS as SwingSet ExtensionSnapshotter
    participant D-CS as Disk
  end

  box whitesmoke JS Main process
    participant CM as Chain Main
    participant D as Disk
    participant SSI as StateSyncImport
    participant ISS as importSwingStore
    participant SS as SwingStore
  end

  TM->>+A-M: OfferSnapshot
  A-M->>+SM-M: Restore()
  SM-M-)+SM-CS: go restoreSnapshot()
  SM-M-->>-A-M: 
  A-M-->>-TM: 

  par Snapshot Restore
    SM-CS->>+MS-CS: Restore()
    loop IAVL snapshot items
      MS-CS->>+SM-CS: protoReader.ReadMsg()
      SM-CS->>+SM-M: chunk = <-chunks
      SM-M-->>-SM-CS: 
      SM-CS-->>-MS-CS: 
      MS-CS->>MS-CS: importer.Add(node)
    end
    MS-CS-->>-SM-CS: 

    opt loop over extensions
      SM-CS->>+SSES-CS: RestoreExtension()
      SSES-CS->>SSES-CS: checkNotActive()
      SSES-CS->>SSES-CS: activeOperation = operationDetails{}
      SSES-CS->>+D-CS: MkDir(exportDir)
      D-CS-->>-SSES-CS: 
      SSES-CS->>+MS-CS: ExportStorageFromPrefix<br/>("swingStore.")
      MS-CS-->>-SSES-CS: vstorage data entries
      loop each data entry
        SSES-CS->>+D-CS: Append(export-data.jsonl, <br/>"JSON(entry tuple)\n")
        D-CS-->>-SSES-CS: 
      end
      loop extension snapshot items
        SSES-CS->>+SM-CS: payloadReader()
        SM-CS->>+SM-M: chunk = <-chunks
        SM-M-->>-SM-CS: 
        SM-CS-->>-SSES-CS: extension payloadBytes
        SSES-CS->>SSES-CS: artifact = parse(payloadBytes)
        SSES-CS->>+D-CS: Write(sanitizedFilename, artifact.data)
        D-CS-->>-SSES-CS: 
      end
      SSES-CS->>+D-CS: Write(export-manifest.jsonl, manifest)
      D-CS-->>-SSES-CS: 
      SSES-CS->>+CM: SWING_STORE_EXPORT/restore
      CM->>+SSI: performStateSyncImport()
      SSI->>+D: Read(export-manifest.json)
      D-->>-SSI: 
      SSI->>+ISS: importSwingStore()
      ISS->>ISS: initSwingStore()
      ISS->>+SSI: exporter.getExportData()
      SSI->>+D: Read(export-data.json)
      D-->>-SSI: 
      SSI-->>-ISS: export data iterator
      ISS->>+SS: restore kv and metadata
      SS-->>-ISS: 
      ISS->>+SSI: exporter.getArtifactNames()
      SSI--)-ISS: names async iterator
      loop each artifact name
        ISS->>+SSI: provider.getArtifact()
        SSI->>+D: Read(artifactFilename)
        D-->>-SSI: 
        SSI--)-ISS: artifactStream
        ISS->>+SS: restore artifact
        SS-->>-ISS: 
      end
      ISS-->>-SSI: 
      SSI->>+SS: set(host.blockHeight)
      SS-->>-SSI: 
      SSI-->>-CM: 
      CM-->>-SSES-CS: 
      SSES-CS->>+D-CS: Delete(exportDir)
      D-CS-->>-SSES-CS: 
      SSES-CS-->>-SM-CS: 
    end
    SM-CS-)-SM-M: chRestoreDone <- restoreDone{}<br/>close(chRestoreDone)
  end

  TM->>+A-M: ApplySnapshotChunk
  A-M->>+SM-M: RestoreChunk()
  SM-M->>SM-M: select chRestoreDone, default
  alt done (abnormal)
    SM-M-->>A-M: false, error
  else normal
    SM-M-)SM-M: chunks <- chunk
    alt chunks remaining
      SM-M-->>A-M: false
    else last chunk
      SM-M->>SM-M: <-chRestoreDone<br/>(blocking)
      SM-M-->>-A-M: true
    end
  end
  A-M-->>-TM: 

```
