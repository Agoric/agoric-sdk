/*
 https://en.wikipedia.org/wiki/Cyclic_redundancy_check
 Copyright (c) 2018 Vladimir Latyshev
 License: MIT
 Algorithms ported from https://pycrc.org/
 Forked from npm polycrc@1.1.0 for module system compatibility.
*/

export class CRC {
  constructor (width, poly, xor_in, xor_out, reflect) {
    this.converter = makeBufferConverter()
    this.width = width
    this.poly = poly
    this.xor_in = xor_in
    this.reflected_xor_in = mirror(xor_in, width)
    this.xor_out = xor_out
    this.reflect = reflect
    this.msb_mask = 1 << (this.width - 1)
    this.mask = ((this.msb_mask - 1) << 1) | 1
    this.crc_shift = this.width < 8 ? 8 - this.width : 0
    this.shifted_xor_in = this.xor_in << this.crc_shift

    let table = this.gen_table()
    this.table = table

    if (this.width === 8 && !this.xor_in && !this.xor_out && !this.reflect) {
      this.calculate = function (buffer) {
        buffer = this.converter.validate_buffer(buffer)
        let crc = 0
        for (let i = 0; i < buffer.length; i++) { crc = table[crc ^ buffer[i]] }
        return crc
      }
    }
  }

  calculate (buffer) {
    buffer = this.converter.validate_buffer(buffer)
    let crc
    let { table, width, crc_shift, mask } = this
    if (this.reflect) {
      crc = this.reflected_xor_in
      for (let i = 0; i < buffer.length; i++) {
        let byte = buffer[i]
        crc = (table[(crc ^ byte) & 0xff] ^ crc >>> 8) & mask
      }
    } else {
      crc = this.shifted_xor_in
      for (let i = 0; i < buffer.length; i++) {
        crc = table[((crc >> (width - 8 + crc_shift)) ^ buffer[i]) & 0xff] << crc_shift ^
          crc << (8 - crc_shift) &
          mask << crc_shift
      }
      crc >>= crc_shift
    }
    crc ^= this.xor_out
    return crc >>> 0
  }

  calculate_no_table (buffer) {
    buffer = this.converter.validate_buffer(buffer)
    let crc = this.xor_in
    for (let i = 0; i < buffer.length; i++) {
      let octet = buffer[i]
      if (this.reflect) octet = mirror(octet, 8)
      for (let i = 0; i < 8; i++) {
        let topbit = crc & this.msb_mask
        if (octet & (0x80 >> i)) topbit ^= this.msb_mask
        crc <<= 1
        if (topbit) crc ^= this.poly
      }
      crc &= this.mask
    }
    if (this.reflect) crc = mirror(crc, this.width)
    crc ^= this.xor_out
    return crc >>> 0
  }

  gen_table () {
    let table_length = 256
    let table = []
    for (let i = 0; i < table_length; i++) {
      let reg = i
      if (this.reflect) reg = mirror(reg, 8)
      reg = reg << (this.width - 8 + this.crc_shift)
      for (let j = 0; j < 8; j++) {
        if ((reg & (this.msb_mask << this.crc_shift)) !== 0) {
          reg <<= 1
          reg ^= this.poly << this.crc_shift
        } else {
          reg <<= 1
        }
      }
      if (this.reflect) reg = mirror(reg >> this.crc_shift, this.width) << this.crc_shift
      reg = (reg >> this.crc_shift) & this.mask
      table[i] = reg >>> 0
    }
    return new Int32Array(table)
  }

  print_table () {
    let table = this.table
    let digits = Math.ceil(this.width / 4)
    let shift = (digits < 4) ? 4 : 3
    let rows = table.length >> shift
    let columns = 1 << shift
    let result = ''
    for (let r = 0; r < rows; r++) {
      let row = ''
      for (let c = 0; c < columns; c++) {
        let val = table[r << shift | c]
        val = '000000000' + val.toString(16)
        val = val.substr(val.length - digits)
        row += '0x' + val + ', '
      }
      result += '  ' + row + '\n'
    }
    result = '[\n' + result.slice(0, -3) + '\n]'
    return result
  }
}

const hasBuffer = typeof Buffer !== 'undefined'
const hasTypedArrays = typeof ArrayBuffer !== 'undefined' && typeof Uint8Array !== 'undefined'

const b256 = typeof BigInt !== undefined && BigInt(256)

class BaseConverter {
  validate_buffer (data) {
    switch (typeof data) {
      case 'number': {
        if (!Number.isSafeInteger(data) || data < 0) {
          throw Error(`number data must be a nonnegative safe integer, not ${data}`)
        }

        if (this.fromUInt32 && data <= 0xffffffff) {
          return this.fromUInt32(data)
        }

        // Unpack the number into a big-endian array of 8-bit values.
        const bytes = []

        // For compatibility with polycrc@1.0.0, we make it at least 4 bytes in length.
        // If we have a number more than 32 bits, we will have more bytes already.
        while (data > 0 || bytes.length < 4) {
          bytes.unshift(data % 256)
          data = Math.floor(data / 256)
        }

        // Just create a buffer from that array.
        return this.fromByteArray(bytes)
      }
      case 'string': {
        return this.fromString(data)
      }
      case 'bigint': {
        if (data < 0) {
          throw Error(`bigint data must be nonnegative, not ${data}`)
        }

        // Unpack the bigint into a big-endian array of 8-bit values.
        const bytes = []

        // For compatibility with polycrc@1.0.0, we make it at least 4 bytes in length.
        // If we have a number more than 32 bits, we will have more bytes already.
        while (data > 0 || bytes.length < 4) {
          bytes.unshift(Number(data % b256))
          data /= b256
        }
        return this.fromByteArray(bytes)
      }
      default: {
        // These conversions are not object methods because we want both
        // BufferConverter and TypedArrayConverter to support whatever the
        // platform is capable of.
        if (hasBuffer && Buffer.isBuffer(data)) {
          return data
        }
        if (hasTypedArrays) {
          if (ArrayBuffer.isView(data)) {
            return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
          }
          if (data instanceof ArrayBuffer) {
            return new Uint8Array(data)
          }
        }
        throw new Error(`Unrecognized data type ${typeof data}: ${data}`)
      }
    }
  }
}

// Convert most things to Buffers.
class BufferConverter extends BaseConverter {
  fromUInt32 (data) {
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32BE(data)
    return buffer
  }

  fromByteArray = Buffer.from.bind(Buffer)
  fromString = Buffer.from.bind(Buffer)
}

// Convert most things to TypedArrays.
class TypedArrayConverter extends BaseConverter {
  fromByteArray = Uint8Array.from.bind(Uint8Array)
  fromString (data) {
    return new TextEncoder('utf-8').encode(data)
  }
}

export function makeBufferConverter (preferTypedArrays = false) {
  if (hasTypedArrays && (preferTypedArrays || !hasBuffer)) {
    return new TypedArrayConverter()
  }
  if (hasBuffer) {
    return new BufferConverter()
  }
  throw Error('either need TypedArrays or Buffer')
}

function mirror (data, width) {
  let res = 0
  for (let i = 0; i < width; i++) {
    res = res << 1 | data & 1
    data >>= 1
  }
  return res
}

export function crc (width, poly, xor_in, xor_out, reflect) {
  let model = new CRC(width, poly, xor_in, xor_out, reflect)
  return model.calculate.bind(model)
}

export const crc1 = new CRC(1, 0x01, 0x00, 0x00, false);
export const crc6 = new CRC(6, 0x2F, 0x00, 0x00, false);
export const crc8 = new CRC(8, 0x07, 0x00, 0x00, false);
export const crc10 = new CRC(10, 0x233, 0x0000, 0x0000, false);
export const crc16 = new CRC(16, 0x8005, 0x0000, 0x0000, true);
export const crc24 = new CRC(24, 0x864CFB, 0xB704CE, 0x000000, false);
export const crc32 = new CRC(32, 0x04C11DB7, 0xFFFFFFFF, 0xFFFFFFFF, true);
export const crc32c = new CRC(32, 0x1EDC6F41, 0xFFFFFFFF, 0xFFFFFFFF, true);

export const models = { crc1, crc6, crc8, crc10, crc16, crc24, crc32, crc32c };
