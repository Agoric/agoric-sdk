#!/usr/bin/awk -f
BEGIN {
  i = 0;
  delete USAGE;
  USAGE[++i] = "Usage: $COMMAND [OPTION]... [FILE]...";
  USAGE[++i] = "Flatten each JSON object \"record\" in a newline-separated sequence.";
  USAGE[++i] = "Flattening converts deep structure into top-level keys";
  USAGE[++i] = "with structured names like \"foo-bar-baz\".";
  USAGE[++i] = "";
  USAGE[++i] = "  -v capdata=true";
  USAGE[++i] = "    Process each record as `{ body: \"<JSON text>\", slots: [...] }` \"capdata\",";
  USAGE[++i] = "    parsing the body and replacing embedded \"@qclass\" objects representing";
  USAGE[++i] = "    data that is not natively JSON-compatible.";
  USAGE[++i] = "  -v unwrap=NAME";
  USAGE[++i] = "    Replace each record by interpreting its specified property as JSON text."
  USAGE[++i] = "    This is useful for consuming output from `agd query vstorage data -o json`.";
  USAGE[++i] = "  -v verbose=1";
  USAGE[++i] = "    Dump information to standard error during processing.";

  # https://man.openbsd.org/sysexits
  EX_USAGE = 64;
  EX_DATAERR = 65;

  # Check for a --help argument and print usage information if found.
  # ARGV[0] is the command name, and ARGV[1] through ARGV[ARGC - 1] are the arguments.
  for (i = 1; i < ARGC; i++) {
    if (ARGV[i] == "--help") {
      for (j = 1; j <= length(USAGE); j++) {
        print USAGE[j];
      }
      exit EX_USAGE;
    }
  }

  # Configure behavior and declare (but do not initialize) options.
  SUBSEP = "\034";
  COLUMNS = ENVIRON["COLUMNS"];
  if (!(COLUMNS >= 10)) {
    COLUMNS = 72;
  }
  g_opt_capdata = "";
  g_opt_unwrap = "";
  g_opt_verbose = 0;

  # Define constants.

  # ASCII_MINUS_NUL contains all ASCII characters in order,
  # starting from 0x01 (avoiding 0x00 for awk portability).
  NUL = "\0";
  ASCII_MINUS_NUL = "";
  for (i = 1; i <= 127; i++) {
    ASCII_MINUS_NUL = ASCII_MINUS_NUL sprintf("%c", i);
  }

  HEX_0400 = hex_to_int("0400");
  HEX_0800 = hex_to_int("0800");
  HEX_D800 = hex_to_int("D800");
  HEX_DC00 = hex_to_int("DC00");
  HEX_10000 = hex_to_int("10000");

  # JSON_OPEN_PUNC and JSON_CLOSE_PUNC are bidirectional mappings
  # between punctuation and value type.
  delete JSON_OPEN_PUNC;
  JSON_OPEN_PUNC["ARRAY"] = "[";
  JSON_OPEN_PUNC["OBJECT"] = "{";
  JSON_OPEN_PUNC["["] = "ARRAY";
  JSON_OPEN_PUNC["{"] = "OBJECT";
  delete JSON_CLOSE_PUNC;
  JSON_CLOSE_PUNC["ARRAY"] = "]";
  JSON_CLOSE_PUNC["OBJECT"] = "}";
  JSON_CLOSE_PUNC["]"] = "ARRAY";
  JSON_CLOSE_PUNC["}"] = "OBJECT";

  delete JSON_PRIMITIVE_TYPES;
  JSON_PRIMITIVE_TYPES["TOKEN_FALSE"] = "BOOLEAN";
  JSON_PRIMITIVE_TYPES["TOKEN_TRUE"] = "BOOLEAN";
  JSON_PRIMITIVE_TYPES["TOKEN_NULL"] = "NULL";
  JSON_PRIMITIVE_TYPES["TOKEN_NUMBER"] = "NUMBER";
  JSON_PRIMITIVE_TYPES["TOKEN_STRING"] = "STRING";

  # https://www.rfc-editor.org/rfc/rfc8259#section-7
  delete JSON_UNESCAPED;
  JSON_UNESCAPED["\\\""] = "\"";
  JSON_UNESCAPED["\\\\"] = "\\";
  JSON_UNESCAPED["\\/"] = "/";
  JSON_UNESCAPED["\\b"] = "\x08";
  JSON_UNESCAPED["\\f"] = "\x0C";
  JSON_UNESCAPED["\\n"] = "\n";
  JSON_UNESCAPED["\\r"] = "\r";
  JSON_UNESCAPED["\\t"] = "\t";
  JSON_NEEDS_ESCAPE = "[\"" NUL "\x01-\x1F\\\\]";
  JSON_STRING_OR_ERROR = "^\"(\\\\[\"\\/bfnrt\\\\]|\\\\u[0-9a-fA-F]{4}|[^\"" NUL "\\x01-\\x1F\\\\])*\"?";
  # For awk portability, avoid {n} quantifiers.
  sub(/\[0-9a-fA-F\][{]4[}]/, "[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]", JSON_STRING_OR_ERROR);

  # Identify the last segment in a SUBSEP-separated string.
  RE_LAST_SEGMENT = SUBSEP "[^" SUBSEP "]*$";

  # Detect UTF-8.
  UTF8 = index(sprintf("%c", 8364), "\xAC") == 3;
}

# starts_with returns 1 if the string starts with the specified prefix
# and 0 otherwise.
function starts_with(str, prefix) {
  return (length(prefix) < length(str)) && (substr(str, 1, length(prefix)) == prefix);
}

# str_tail returns the slice of str starting at 1-based index i.
function str_tail(str, i, __, L) {
  L = length(str);
  if (i > L) {
    return "";
  }
  return substr(str, i, L - i + 1);
}

# hex_to_int returns the integer represented by a sequence of hexadecimal digits.
function hex_to_int(hex, __, n) {
  n = 0;
  hex = toupper(hex);
  while (hex) {
    n = n * 16 + index("0123456789ABCDEF", substr(hex, 1, 1)) - 1;
    hex = str_tail(hex, 2);
  }
  return n;
}

# utf8 returns a string of octets containing the UTF-8 representation of a code point.
function utf8(cp, __, octets, high, low, tmp) {
  if (UTF8) {
    return sprintf("%c", cp);
  }
  # https://en.wikipedia.org/wiki/UTF-8#Encoding
  if (cp < 128) {
    return sprintf("%c", cp);
  }
  high = int(cp / 64);
  low = cp - (high * 64);
  octets = sprintf("%c", 128 + low);
  if (cp < HEX_0800) {
    return sprintf("%c", 192 + high) octets;
  }
  tmp = int(high / 64);
  low = high - (tmp * 64);
  high = tmp;
  octets = sprintf("%c", 128 + low) octets;
  if (cp < HEX_10000) {
    return sprintf("%c", 224 + high) octets;
  }
  tmp = int(high / 64);
  low = high - (tmp * 64);
  high = tmp;
  return sprintf("%c", 240 + high) sprintf("%c", 128 + low) octets;
}

# json_quote returns a JSON string with value equal to str.
function json_quote(str, __, quoted, re, ch, e) {
  quoted = "";
  while (match(str, JSON_NEEDS_ESCAPE)) {
    if (RSTART > 1) {
      quoted = quoted substr(str, 1, RSTART - 1);
    }
    ch = substr(str, RSTART, 1);
    str = str_tail(str, RSTART + 1);
    if (ch == "\"" || ch == "\\") e = ch;
    else if (ch == "\x08") e = "b";
    else if (ch == "\x0C") e = "f";
    else if (ch == "\n") e = "n";
    else if (ch == "\r") e = "r";
    else if (ch == "\t") e = "t";
    else if (ch == "\x00") e = "u0000";
    else e = "u00" sprintf("%02X", index(ASCII_MINUS_NUL, ch));
    quoted = quoted "\\" e;
  }
  return "\"" quoted str "\"";
}

# normalize_json_string returns a normalized representation of a JSON string.
function normalize_json_string(str, __, normalized, e, cp) {
  normalized = "";
  # https://www.rfc-editor.org/rfc/rfc8259#section-7
  while (match(str, /\\\/|\\u..../)) {
    if (RSTART > 1) {
      normalized = normalized substr(str, 1, RSTART - 1);
    }
    e = substr(str, RSTART, RLENGTH);
    str = str_tail(str, RSTART + RLENGTH);
    if (e == "\\/") {
      # Replace escaped slashes (`\/`) with unescaped slashes (`/`).
      e = "/";
    } else {
      # This is a Unicode escape sequence (`\uXXXX`).
      # Uppercase the hex digits.
      e = substr(e, 1, 2) toupper(str_tail(e, 3));
      if (match(e, /^\\u00[0-7]/)) {
        # Replace escapes in the Basic Latin block (ASCII) with their shortest representation.
        cp = substr(e, 5, 2);
        if (cp == "22") e = "\\\"";
        else if (cp == "5C") e = "\\\\";
        else if (cp == "2F") e = "/";
        else if (cp == "08") e = "\\b";
        else if (cp == "0C") e = "\\f";
        else if (cp == "0A") e = "\\n";
        else if (cp == "0D") e = "\\r";
        else if (cp == "09") e = "\\t";
        else {
          cp = hex_to_int(cp);
          if (cp >= 32 && cp <= 127) {
            e = substr(ASCII_MINUS_NUL, cp, 1);
          }
        }
      } else {
        # Decode other escapes into their escaped characters.
        if (match(e, /^\\uD[89AB]/) && match(str, /^\\u[Dd][CcDdEeFf]../)) {
          # Decode a surrogate pair and consume the relevant extra prefix of str.
          # https://en.wikipedia.org/wiki/UTF-16
          cp = (hex_to_int(substr(e, 3, 4)) - HEX_D800) * HEX_0400;
          e = substr(str, RSTART, RLENGTH);
          str = str_tail(str, RSTART + RLENGTH);
          cp += (hex_to_int(substr(e, 3, 4)) - HEX_DC00);
          cp += HEX_10000;
        } else {
          # Decode a Basic Multilingual Plane (Plane 0) character.
          cp = hex_to_int(substr(e, 3, 4));
        }
        e = utf8(cp);
      }
    }
    normalized = normalized e;
  }
  return normalized str;
}

# eval_json_string returns the string value represented by JSON text.
function eval_json_string(json, __, str, e, cp) {
  str = "";

  # Normalize contents, strip wrapping quotes, and decode escape sequences.
  json = normalize_json_string(json);
  json = substr(json, 2, length(json) - 2);

  # https://www.rfc-editor.org/rfc/rfc8259#section-7
  while (match(json, /\\[^u]|\\u..../)) {
    if (RSTART > 1) {
      str = str substr(json, 1, RSTART - 1);
    }
    e = substr(json, RSTART, RLENGTH);
    json = str_tail(json, RSTART + RLENGTH);
    if (length(e) == 2) {
      # Decode a single-character escape.
      e = JSON_UNESCAPED[e];
    } else {
      # Decode a Unicode escape (which will always be in Plane 0 because of the normalization).
      cp = hex_to_int(substr(e, 3, 4));
      e = utf8(cp);
    }
    str = str e;
  }
  return str json;
}

# read_json_token returns a structured string representing the token at the start of a string
# or an error describing the absence of a token.
# The representation is a type in [TOKEN_ERROR, TOKEN_FALSE, TOKEN_NULL, TOKEN_NUMBER,
# TOKEN_PUNC, TOKEN_STRING, TOKEN_TRUE, TOKEN_WHITESPACE],
# followed by a space and then either a length or (for TOKEN_ERROR) an error message.
function read_json_token(str, __, text, err) {
  # https://www.rfc-editor.org/rfc/rfc8259#section-2
  if (match(str, /^[[{\]}:,]/)) {
    return "TOKEN_PUNC 1";
  }
  # https://www.rfc-editor.org/rfc/rfc8259#section-2
  if (match(str, /^(false|null|true)/)) {
    text = substr(str, 1, RLENGTH);
    if (length(str) == RLENGTH || !match(substr(str, RLENGTH + 1, 1), /[[:alnum:]]/)) {
      return sprintf("TOKEN_%s %d", toupper(text), length(text));
    }
  }
  # https://www.rfc-editor.org/rfc/rfc8259#section-6
  if (match(str, /^-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][-+][0-9]+)?/)) {
    text = substr(str, 1, RLENGTH);
    if (length(str) == RLENGTH || !match(substr(str, RLENGTH + 1, 1), /[[:alnum:]]/)) {
      return sprintf("TOKEN_NUMBER %d", length(text));
    }
  }
  # https://www.rfc-editor.org/rfc/rfc8259#section-7
  if (match(str, JSON_STRING_OR_ERROR)) {
    text = substr(str, 1, RLENGTH);
    if (str_tail(text, length(text)) == "\"") {
      return sprintf("TOKEN_STRING %d", RLENGTH);
    }
    err = "Unterminated string";
  }
  # https://www.rfc-editor.org/rfc/rfc8259#section-2
  if (match(str, /^[ \t\n\r]+/)) {
    return sprintf("TOKEN_WHITESPACE %d", RLENGTH);
  }

  if (!err) {
    err = "No valid token";
  }
  err = "TOKEN_ERROR " err;
  if (COLUMNS - length(err) >= 6) {
    err = err ": " str;
    if (length(err) > COLUMNS) {
      err = substr(err, 1, COLUMNS - 3) "...";
    }
  }
  return err;
}

# reset_parse initializes global variables related to parsing JSON.
function reset_parse(input, line_number) {
  if (!line_number) {
    line_number = 1;
  }
  g_parse_input = input;
  g_parse_expect = "EXPECT_VALUE";
  g_parse_line_range[1] = line_number;
  g_parse_line_range[2] = line_number;
  # g_parse_value stores the parsed data as a flattened multi-level object
  # using SUBSEP to structure keys.
  # Each level has a `type` in [ARRAY, OBJECT, FALSE, NULL, TRUE, NUMBER, or STRING].
  # Arrays additionally have a numeric `length` and deeper levels in [0, length).
  # Objects additionally have a numeric `length`, normalized JSON string member names
  # by order of appearance in [0, length),
  # and deeper levels by those member names prefixed with `value `.
  # Primitives additionally have a JSON text `value`.
  g_parse_deepest_key = "";
  delete g_parse_value;
  g_parse_value["", "type"] = "";
}

# parse_more_json reads from g_parse_input until that is exhausted or produces an error,
# along the way updating g_parse global variables (notably including g_parse_value)
# and returning empty or the error message.
function parse_more_json(__, col, token_data, tmp, token_type, token_text, token_repr, L) {
  col = 1;
  token_data = 0;
  while (g_parse_input != "") {
    col += token_data;
    token_data = read_json_token(g_parse_input);
    tmp = index(token_data, " ");
    token_type = substr(token_data, 1, tmp - 1);
    token_data = str_tail(token_data, tmp + 1);
    # For errors, token_data is a message. Otherwise, token_data is a nonzero length.
    token_text = "";
    if (token_type != "TOKEN_ERROR") {
      token_text = substr(g_parse_input, 1, token_data);
    }
    if (g_opt_verbose >= 2) {
      if (token_type == "TOKEN_ERROR") {
        token_repr = token_data;
      } else {
        token_repr = token_text;
        if (token_type == "TOKEN_WHITESPACE") {
          token_repr = json_quote(token_repr);
          token_repr = "`" substr(token_repr, 2, length(token_repr) - 2) "`";
        }
        token_repr = sprintf("length=%d %s", token_data, token_repr);
      }
      printf "Token at line %d column %d %s: %s %s\n",
        g_parse_line_range[2],
        col,
        g_parse_expect,
        token_type,
        token_repr > "/dev/stderr";
    }
    if (token_type == "TOKEN_ERROR") {
      return sprintf("Tokenization error at line %d column %d: %s",
        g_parse_line_range[2],
        col,
        token_data);
    }
    g_parse_input = str_tail(g_parse_input, token_data + 1);

    if (token_type == "TOKEN_WHITESPACE") {
      # All whitespace is insignificant,
      # but we still need to advance line and/or column number.
      L = gsub(/\r?\n/, "\n", token_text);
      if (L > 0) {
        g_parse_line_range[2] += L;
        sub(/(^|[^\n])[.\n]*\n/, "", token_text);
        col = 1;
        token_data = length(token_text);
      }
      continue;
    }

    # An array or object can be closed
    # either before the first value/member or after any value/member.
    tmp = g_parse_deepest_key;
    sub(RE_LAST_SEGMENT, "", tmp);
    if (token_type == "TOKEN_PUNC" &&
        token_text == JSON_CLOSE_PUNC[g_parse_value[tmp, "type"]] &&
        (g_parse_value[tmp, "length"] == 0 || g_parse_expect == "EXPECT_COMMA_OR_CLOSE")) {
      # Expect the appropriate successor (cf. EXPECT_VALUE primitive handling).
      g_parse_deepest_key = tmp;
      if (g_parse_deepest_key == "") {
        g_parse_expect = "EXPECT_NOTHING";
      } else {
        g_parse_expect = "EXPECT_COMMA_OR_CLOSE";
      }
      continue;
    }

    # An array value or object member value increments parent `length`
    # without interrupting other processing.
    tmp = ((token_type == "TOKEN_PUNC" && index("[{", token_text)) ||
        JSON_PRIMITIVE_TYPES[token_type] != "");
    if (g_parse_expect == "EXPECT_VALUE" && tmp) {
      if (g_parse_deepest_key != "") {
        tmp = g_parse_deepest_key;
        sub(RE_LAST_SEGMENT, "", tmp);
        g_parse_value[tmp, "length"] += 1;
      }
    }

    if (g_parse_expect == "EXPECT_VALUE") {
      if (token_type == "TOKEN_PUNC" && JSON_OPEN_PUNC[token_text]) {
        g_parse_value[g_parse_deepest_key, "type"] = JSON_OPEN_PUNC[token_text];
        g_parse_value[g_parse_deepest_key, "length"] = 0;
        g_parse_deepest_key = g_parse_deepest_key SUBSEP 0;
        g_parse_expect = "EXPECT_VALUE";
        if (token_text == "{") {
          g_parse_expect = "EXPECT_MEMBER_NAME";
        }
        continue;
      } else if (JSON_PRIMITIVE_TYPES[token_type]) {
        g_parse_value[g_parse_deepest_key, "type"] = JSON_PRIMITIVE_TYPES[token_type];
        g_parse_value[g_parse_deepest_key, "value"] = token_text;
        # Expect the appropriate successor (cf. array/object close handling).
        if (g_parse_deepest_key == "") {
          g_parse_expect = "EXPECT_NOTHING";
        } else {
          g_parse_expect = "EXPECT_COMMA_OR_CLOSE";
        }
        continue;
      }
    } else if (g_parse_expect == "EXPECT_MEMBER_NAME") {
      if (token_type == "TOKEN_STRING") {
        # Normalize and consume an object member name.
        token_text = normalize_json_string(token_text);
        g_parse_value[g_parse_deepest_key] = token_text;
        sub(RE_LAST_SEGMENT, SUBSEP "value " token_text, g_parse_deepest_key);
        g_parse_expect = "EXPECT_MEMBER_SEPARATOR";
        continue;
      }
    } else if (g_parse_expect == "EXPECT_MEMBER_SEPARATOR") {
      if (token_type == "TOKEN_PUNC" && token_text == ":") {
        g_parse_expect = "EXPECT_VALUE";
        continue;
      }
    } else if (g_parse_expect == "EXPECT_COMMA_OR_CLOSE") {
      if (token_type == "TOKEN_PUNC" && token_text == ",") {
        # Expect the next array value or object member.
        sub(RE_LAST_SEGMENT, "", g_parse_deepest_key);
        tmp = g_parse_value[g_parse_deepest_key, "type"];
        L = g_parse_value[g_parse_deepest_key, "length"];
        g_parse_deepest_key = g_parse_deepest_key SUBSEP L;
        g_parse_expect = "EXPECT_VALUE";
        if (tmp == "OBJECT") {
          g_parse_expect = "EXPECT_MEMBER_NAME";
        }
        continue;
      }
    }

    # Anything unexpected is an error.
    return sprintf("Unexpected token at line %d column %d %s: %s %s",
      g_parse_line_range[2],
      col,
      g_parse_expect,
      token_type,
      token_text);
  }
}

# delete_parsed_value removes a value and all its descendants from g_parse_value.
function delete_parsed_value(prefix, __, k, k2, marked, n, i) {
  delete marked;
  n = 0;
  for (k in g_parse_value) {
    if (starts_with(k, prefix SUBSEP)) {
      marked[++n] = k;
    }
  }
  for (i = 1; i <= n; i++) {
    delete g_parse_value[marked[i]];
  }
}

# expand_capdata replaces capdata "@qclass" objects in g_parse value.
# * Slot references are replaced with
#   { id: <value from global `slots`>, allegedName: "<extracted from local `iface`>" }
# * Bigints are replaced with their `digits` string.
# * All other capdata objects are rejected.
function expand_capdata(prefix, __, qclass_key, qclass, k, tmp, i) {
  qclass_key = prefix SUBSEP "value \"@qclass\"" SUBSEP "value";
  if (qclass_key in g_parse_value) {
    qclass = g_parse_value[qclass_key];
    if (qclass == "\"slot\"") {
      # Assert expected slot reference shape:
      # * "index", an integer referencing a valid index in top-level "slots"
      # * "iface", a string starting with `Alleged: <name>"`
      tmp = g_parse_value[prefix, "value \"index\"", "value"];
      qclass_key = SUBSEP tmp SUBSEP;
      if (!((qclass_key "type") in g_slotdata) ||
          !match(g_parse_value[prefix, "value \"iface\"", "value"], /^"Alleged: [^[:space:]"\\]+/)) {
        tmp = str_tail(prefix, 2);
        gsub(SUBSEP, ",", tmp);
        printf "@qclass \"slot\" bad `index` [%s] or `iface` [%s] at capdata path: %s\n",
          g_parse_value[prefix, "value \"index\"", "value"],
          g_parse_value[prefix, "value \"iface\"", "value"],
          tmp > "/dev/stderr";
        exit EX_DATAERR;
      }

      # Replace the object at `prefix` with one that has a new shape:
      # * "id" copied from the referenced slot (and expected to be a string)
      # * "allegedName", a string containing the extracted name
      tmp = substr(g_parse_value[prefix, "value \"iface\"", "value"], 11, RLENGTH - 10);
      delete_parsed_value(prefix);
      g_parse_value[prefix, "type"] = "OBJECT";
      g_parse_value[prefix, "length"] = 2;
      g_parse_value[prefix, 0] = "\"id\"";
      for (k in g_slotdata) {
        if (starts_with(k, qclass_key)) {
          i = str_tail(k, length(qclass_key) + 1);
          g_parse_value[prefix, "value \"id\"", i] = g_slotdata[k];
        }
      }
      g_parse_value[prefix, 1] = "\"allegedName\"";
      g_parse_value[prefix, "value \"allegedName\"", "type"] = "STRING";
      g_parse_value[prefix, "value \"allegedName\"", "value"] = json_quote(tmp);
    } else if (qclass == "\"bigint\"") {
      # Replace the object at `prefix` with its `digits` string.
      if (g_parse_value[prefix, "value \"digits\"", "type"] != "STRING") {
        tmp = str_tail(prefix, 2);
        gsub(SUBSEP, ",", tmp);
        printf "@qclass \"bigint\" missing string `digits` at capdata path: %s\n",
          tmp > "/dev/stderr";
        exit EX_DATAERR;
      }
      tmp = g_parse_value[prefix, "value \"digits\"", "value"];
      delete_parsed_value(prefix);
      g_parse_value[prefix, "type"] = "STRING";
      g_parse_value[prefix, "value"] = tmp;
    } else {
      tmp = str_tail(qclass_key, 2);
      gsub(SUBSEP, ",", tmp);
      printf "Unsupported @qclass %s at capdata path: %s\n",
        qclass,
        tmp > "/dev/stderr";
      exit EX_DATAERR;
    }
    return;
  }

  # Recurse into children.
  tmp = g_parse_value[prefix, "type"];
  if (JSON_CLOSE_PUNC[tmp]) {
    for (i = 0; i < g_parse_value[prefix, "length"]; i++) {
      k = prefix SUBSEP i;
      if (tmp == "OBJECT") {
        k = prefix SUBSEP "value " g_parse_value[k];
      }
      expand_capdata(k);
    }
  }
}

# flatten_json collapses all data in g_parse_value at or under src_key
# into dest_obj_key by combining member names with "-".
# If src_key is absent, all data under dest_obj_key is rolled up.
function flatten_json(dest_obj_key, src_key, src_name, __,
    is_dest, type, L, i, member_names, name_prefix, quoted_name, dest_key) {
  if (!src_key) {
    is_dest = 1;
    src_key = dest_obj_key;
  }
  type = g_parse_value[src_key, "type"];
  if (JSON_CLOSE_PUNC[type]) {
    L = g_parse_value[src_key, "length"];
    g_parse_value[src_key, "length"] = 0;

    # Collect object member names into an array.
    if (type == "OBJECT") {
      for (i = 0; i < L; i++) {
        member_names[i] = g_parse_value[src_key, i];
        delete g_parse_value[src_key, i];
      }
    }

    # Recurse.
    name_prefix = src_name;
    if (src_name != "") {
      name_prefix = src_name "-";
    }
    for (i = 0; i < L; i++) {
      if (type == "OBJECT") {
        flatten_json(dest_obj_key,
          src_key SUBSEP "value " member_names[i],
          name_prefix eval_json_string(member_names[i]));
      } else {
        flatten_json(dest_obj_key, src_key SUBSEP i, name_prefix i);
      }
    }

    # Clean up.
    if (!is_dest) {
      delete g_parse_value[src_key, "type"];
      delete g_parse_value[src_key, "length"];
    }
  } else {
    # Move a primitive value ({type, value}).
    L = g_parse_value[dest_obj_key, "length"];
    g_parse_value[dest_obj_key, "length"] += 1;
    quoted_name = json_quote(src_name);
    g_parse_value[dest_obj_key, L] = quoted_name;
    dest_key = dest_obj_key SUBSEP "value " quoted_name;
    if (dest_key == src_key) {
      return;
    }
    g_parse_value[dest_key, "type"] = g_parse_value[src_key, "type"];
    g_parse_value[dest_key, "value"] = g_parse_value[src_key, "value"];
    delete g_parse_value[src_key, "type"];
    delete g_parse_value[src_key, "value"];
  }
}

# print_json prints a JSON representation of the value in g_parse_value at a specified location.
function print_json(prefix, __, type, L, i, k) {
  type = g_parse_value[prefix, "type"];
  if (JSON_OPEN_PUNC[type]) {
    printf JSON_OPEN_PUNC[type];
    L = g_parse_value[prefix, "length"];
    for (i = 0; i < L; i++) {
      if (i > 0) {
        printf ",";
      }
      k = prefix SUBSEP i;
      if (type == "OBJECT") {
        k = g_parse_value[k];
        printf "%s:", k;
        k = prefix SUBSEP "value " k;
      }
      print_json(k);
    }
    printf JSON_CLOSE_PUNC[type];
  } else {
    printf "%s", g_parse_value[prefix, "value"];
  }
}


BEGIN {
  # Initialize.
  g_opt_capdata = capdata;
  if (unwrap) {
    g_opt_unwrap = json_quote(unwrap);
  }
  if (verbose) {
    g_opt_verbose += verbose;
  }
  reset_parse();
  g_parse_expect = "EXPECT_NOTHING";
  delete g_slotdata;
}
{
  # Reinitialize parse state for each record in the sequence.
  if (g_parse_expect == "EXPECT_NOTHING") {
    reset_parse("", NR);
  }

  # Feed in the current line.
  g_parse_line_range[2] = NR;
  g_parse_input = $0;
  parse_err = parse_more_json();
  if (parse_err != "") {
    print parse_err > "/dev/stderr";
    exit EX_DATAERR;
  }

  # Verify that something has been parsed.
  if (!g_parse_value["", "type"]) {
    printf "No record at line %d\n", NR > "/dev/stderr";
    exit EX_DATAERR;
  }

  # If we've read a complete record, process it.
  if (g_parse_expect == "EXPECT_NOTHING") {
    record_start_line = g_parse_line_range[1];

    # Optionally unwrap.
    if (g_opt_unwrap) {
      if (g_parse_value["", "type"] != "OBJECT" ||
          g_parse_value["", "value " g_opt_unwrap, "type"] != "STRING") {
        printf "Bad %s wrapper at line %d\n", g_opt_unwrap, g_parse_line_range[1] > "/dev/stderr";
        exit EX_DATAERR;
      }
      reset_parse(eval_json_string(g_parse_value["", "value " g_opt_unwrap, "value"]));
      if (g_opt_verbose >= 1) {
        printf "Unwrapping %s: %s\n", g_opt_unwrap, g_parse_input > "/dev/stderr";
      }
      parse_err = parse_more_json();
      if (parse_err != "") {
        printf "Couldn't parse %s at lines [%d, %d]: %s\n",
            g_opt_unwrap,
            record_start_line,
            NR,
            parse_err > "/dev/stderr";
        exit EX_DATAERR;
      }
      if (g_parse_expect != "EXPECT_NOTHING") {
        printf "Extra characters in %s at lines [%d, %d]: %s\n",
            g_opt_unwrap,
            record_start_line,
            NR,
            g_parse_input > "/dev/stderr";
        exit EX_DATAERR;
      }
    }

    # Optionally decode capdata.
    if (g_opt_capdata) {
      # Expect a body containing a string of JSON text
      # and a slots array containing values referenceable by the deserialized body.
      if (g_parse_value["", "type"] != "OBJECT" ||
          g_parse_value["", "value \"body\"", "type"] != "STRING") {
        printf "Bad capdata at line %d\n", g_parse_line_range[1] > "/dev/stderr";
        exit EX_DATAERR;
      }
      delete g_slotdata;
      slot_prefix = SUBSEP "value \"slots\"";
      for (k in g_parse_value) {
        if (starts_with(k, slot_prefix)) {
          g_slotdata[str_tail(k, length(slot_prefix) + 1)] = g_parse_value[k];
        }
      }
      reset_parse(eval_json_string(g_parse_value["", "value \"body\"", "value"]));
      if (g_opt_verbose >= 1) {
        printf "Decoding capdata: %s\n", g_parse_input > "/dev/stderr";
      }
      parse_err = parse_more_json();
      if (parse_err != "") {
        printf "Couldn't decode capdata at lines [%d, %d]: %s\n",
            record_start_line,
            NR,
            parse_err > "/dev/stderr";
        exit EX_DATAERR;
      }
      if (g_parse_expect != "EXPECT_NOTHING") {
        printf "Extra characters in capdata at lines [%d, %d]: %s\n",
            record_start_line,
            NR,
            g_parse_input > "/dev/stderr";
        exit EX_DATAERR;
      }

      # Expand capdata to simplify special values and remove slot references,
      # flatten objects into combined strings, and dump as JSON.
      expand_capdata("");
    }

    flatten_json("");
    print_json("");
    print "";
  }
}
