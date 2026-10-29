"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/postgres-array/index.js
var require_postgres_array = __commonJS({
  "node_modules/postgres-array/index.js"(exports2) {
    "use strict";
    exports2.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character = this.source[this.position++];
        if (character === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character,
          escaped: false
        };
      }
      record(character) {
        this.recorded.push(character);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null) entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=") break;
          }
        }
      }
      parse(nested) {
        var character, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character = this.nextCharacter();
          if (character.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested) return this.entries;
            }
          } else if (character.value === '"' && !character.escaped) {
            if (quote) this.newEntry(true);
            quote = !quote;
          } else if (character.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
  }
});

// node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS({
  "node_modules/pg-types/lib/arrayParser.js"(exports2, module2) {
    var array = require_postgres_array();
    module2.exports = {
      create: function(source, transform) {
        return {
          parse: function() {
            return array.parse(source, transform);
          }
        };
      }
    };
  }
});

// node_modules/postgres-date/index.js
var require_postgres_date = __commonJS({
  "node_modules/postgres-date/index.js"(exports2, module2) {
    "use strict";
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY = /^-?infinity$/;
    module2.exports = function parseDate(isoDate) {
      if (INFINITY.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms = matches[7];
      ms = ms ? 1e3 * parseFloat(ms) : 0;
      var date;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        if (is0To99(year)) {
          date.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date.setTime(date.getTime() - offset);
        }
      } else {
        date = new Date(year, month, day, hour, minute, second, ms);
        if (is0To99(year)) {
          date.setFullYear(year);
        }
      }
      return date;
    };
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date = new Date(year, month, day);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
      return date;
    }
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone) return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign2 = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign2 * 1e3;
    }
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    function is0To99(num2) {
      return num2 >= 0 && num2 < 100;
    }
  }
});

// node_modules/xtend/mutable.js
var require_mutable = __commonJS({
  "node_modules/xtend/mutable.js"(exports2, module2) {
    module2.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
  }
});

// node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS({
  "node_modules/postgres-interval/index.js"(exports2, module2) {
    "use strict";
    var extend = require_mutable();
    module2.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend(this, parse(raw));
    }
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0) return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    function parse(interval) {
      if (!interval) return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value) return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value) return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
  }
});

// node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS({
  "node_modules/postgres-bytea/index.js"(exports2, module2) {
    "use strict";
    var bufferFrom = Buffer.from || Buffer;
    module2.exports = function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return bufferFrom(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return bufferFrom(output, "binary");
    };
  }
});

// node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS({
  "node_modules/pg-types/lib/textParsers.js"(exports2, module2) {
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return function nullAllowed(value) {
        if (value === null) return value;
        return fn(value);
      };
    }
    function parseBool(value) {
      if (value === null) return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    function parseBoolArray(value) {
      if (!value) return null;
      return array.parse(value, parseBool);
    }
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    function parseIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    function parseBigIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    var parsePointArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseFloatArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseStringArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value);
      return p.parse();
    };
    var parseDateArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseIntervalArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseByteAArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    };
    var parseInteger = function(value) {
      return parseInt(value, 10);
    };
    var parseBigInteger = function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    };
    var parseJsonArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    };
    var parsePoint = function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    };
    var parseCircle = function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    };
    var init = function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    };
    module2.exports = {
      init
    };
  }
});

// node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS({
  "node_modules/pg-int8/index.js"(exports2, module2) {
    "use strict";
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign2 = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign2 = "-";
      }
      var result = "";
      var carry;
      var t;
      var digits;
      var pad;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign2 + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign2 + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign2 + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        t = 4294967296 * carry + low;
        digits = "" + t % BASE;
        return sign2 + digits + result;
      }
    }
    module2.exports = readInt8;
  }
});

// node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS({
  "node_modules/pg-types/lib/binaryParsers.js"(exports2, module2) {
    var parseInt64 = require_pg_int8();
    var parseBits = function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      };
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    };
    var parseFloatFromBits = function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign2 = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      };
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign2 === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign2 === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    };
    var parseInt16 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    };
    var parseInt32 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    };
    var parseFloat32 = function(value) {
      return parseFloatFromBits(value, 23, 8);
    };
    var parseFloat64 = function(value) {
      return parseFloatFromBits(value, 52, 11);
    };
    var parseNumeric = function(value) {
      var sign2 = parseBits(value, 16, 32);
      if (sign2 == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign2 === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    };
    var parseDate = function(isUTC, value) {
      var sign2 = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign2 === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    };
    var parseArray = function(value) {
      var dim = parseBits(value, 32);
      var flags = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      };
      var parse = function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count = dimension.shift();
          for (i2 = 0; i2 < count; i2++) {
            array[i2] = parse(dimension, elementType2);
          }
          dimension.unshift(count);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      };
      return parse(dims, elementType);
    };
    var parseText = function(value) {
      return value.toString("utf8");
    };
    var parseBool = function(value) {
      if (value === null) return null;
      return parseBits(value, 8) > 0;
    };
    var init = function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    };
    module2.exports = {
      init
    };
  }
});

// node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS({
  "node_modules/pg-types/lib/builtins.js"(exports2, module2) {
    module2.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});

// node_modules/pg-types/index.js
var require_pg_types = __commonJS({
  "node_modules/pg-types/index.js"(exports2) {
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports2.getTypeParser = getTypeParser;
    exports2.setTypeParser = setTypeParser;
    exports2.arrayParser = arrayParser;
    exports2.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    function getTypeParser(oid, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid] || noParse;
    }
    function setTypeParser(oid, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid] = parseFn;
    }
    textParsers.init(function(oid, converter) {
      typeParsers.text[oid] = converter;
    });
    binaryParsers.init(function(oid, converter) {
      typeParsers.binary[oid] = converter;
    });
  }
});

// node_modules/pg/lib/defaults.js
var require_defaults = __commonJS({
  "node_modules/pg/lib/defaults.js"(exports2, module2) {
    "use strict";
    var user;
    try {
      user = process.platform === "win32" ? process.env.USERNAME : process.env.USER;
    } catch {
    }
    module2.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      // SSL negotiation style: 'postgres' (traditional SSLRequest) or 'direct'
      sslnegotiation: void 0,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module2.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});

// node_modules/pg/lib/utils.js
var require_utils = __commonJS({
  "node_modules/pg/lib/utils.js"(exports2, module2) {
    "use strict";
    var defaults = require_defaults();
    var nodeUtils = require("util");
    var { isDate } = require("util/types");
    var invalidDateDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Sending an invalid date to Postgres is deprecated and will throw an error in the next major version of pg. Ensure any Date object passed as a query parameter is valid.",
      "PG_INVALID_DATE"
    );
    function escapeElement(elementRepresentation) {
      const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    function arrayString(val) {
      let result = "{";
      for (let i = 0; i < val.length; i++) {
        if (i > 0) {
          result += ",";
        }
        let item = val[i];
        if (item == null) {
          result += "NULL";
        } else if (Array.isArray(item)) {
          result += arrayString(item);
        } else if (ArrayBuffer.isView(item)) {
          if (!(item instanceof Buffer)) {
            item = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
          }
          result += "\\\\x" + item.toString("hex");
        } else {
          result += escapeElement(prepareValue(item));
        }
      }
      result += "}";
      return result;
    }
    var prepareValue = function(val, seen) {
      if (val == null) {
        return null;
      }
      if (typeof val === "object") {
        if (val instanceof Buffer) {
          return val;
        }
        if (ArrayBuffer.isView(val)) {
          return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
        }
        if (isDate(val)) {
          if (isNaN(val.getTime())) {
            invalidDateDeprecationNotice();
          }
          if (defaults.parseInputDatesAsUTC) {
            return dateToStringUTC(val);
          } else {
            return dateToString(val);
          }
        }
        if (Array.isArray(val)) {
          return arrayString(val);
        }
        return prepareObject(val, seen);
      }
      return val.toString();
    };
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    function dateToString(date) {
      let offset = -date.getTimezoneOffset();
      let year = date.getFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0") + "." + String(date.getMilliseconds()).padStart(3, "0");
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
      if (isBCYear) ret += " BC";
      return ret;
    }
    function dateToStringUTC(date) {
      let year = date.getUTCFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0") + "T" + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + ":" + String(date.getUTCSeconds()).padStart(2, "0") + "." + String(date.getUTCMilliseconds()).padStart(3, "0");
      ret += "+00:00";
      if (isBCYear) ret += " BC";
      return ret;
    }
    function normalizeQueryConfig(config, values, callback) {
      config = typeof config === "string" ? { text: config } : cloneQueryConfig(config);
      if (values) {
        if (typeof values === "function") {
          config.callback = values;
        } else {
          config.values = values;
        }
      }
      if (callback) {
        config.callback = callback;
      }
      return config;
    }
    function cloneQueryConfig(config) {
      if (config == null) {
        return config;
      }
      return Object.defineProperties(Object.create(Object.getPrototypeOf(config)), Object.getOwnPropertyDescriptors(config));
    }
    var escapeIdentifier = function(str2) {
      return '"' + str2.replace(/"/g, '""') + '"';
    };
    var escapeLiteral = function(str2) {
      let hasBackslash = false;
      let escaped = "'";
      if (str2 == null) {
        return "''";
      }
      if (typeof str2 !== "string") {
        return "''";
      }
      for (let i = 0; i < str2.length; i++) {
        const c = str2[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    };
    module2.exports = {
      prepareValue: function prepareValueWrapper(value) {
        return prepareValue(value);
      },
      normalizeQueryConfig,
      escapeIdentifier,
      escapeLiteral
    };
  }
});

// node_modules/pg/lib/crypto/utils.js
var require_utils2 = __commonJS({
  "node_modules/pg/lib/crypto/utils.js"(exports2, module2) {
    var nodeCrypto = require("crypto");
    module2.exports = {
      postgresMd5PasswordHash,
      randomBytes,
      deriveKey,
      sha256,
      hashByName,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder = new TextEncoder();
    function randomBytes(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder.encode(string) : string;
        const hash = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
    async function postgresMd5PasswordHash(user, password, salt) {
      const inner = await md5(password + user);
      const outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    async function sha256(text) {
      return await subtleCrypto.digest("SHA-256", text);
    }
    async function hashByName(hashName, text) {
      return await subtleCrypto.digest(hashName, text);
    }
    async function hmacSha256(keyBuffer, msg) {
      const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
    }
    async function deriveKey(password, salt, iterations) {
      const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
    }
  }
});

// node_modules/pg/lib/crypto/cert-signatures.js
var require_cert_signatures = __commonJS({
  "node_modules/pg/lib/crypto/cert-signatures.js"(exports2, module2) {
    function x509Error(msg, cert) {
      return new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
    }
    function readASN1Length(data, index) {
      let length = data[index++];
      if (length < 128) return { length, index };
      const lengthBytes = length & 127;
      if (lengthBytes > 4) throw x509Error("bad length", data);
      length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = length << 8 | data[index++];
      }
      return { length, index };
    }
    function readASN1OID(data, index) {
      if (data[index++] !== 6) throw x509Error("non-OID data", data);
      const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
      index = indexAfterOIDLength;
      const lastIndex = index + OIDLength;
      const byte1 = data[index++];
      let oid = (byte1 / 40 >> 0) + "." + byte1 % 40;
      while (index < lastIndex) {
        let value = 0;
        while (index < lastIndex) {
          const nextByte = data[index++];
          value = value << 7 | nextByte & 127;
          if (nextByte < 128) break;
        }
        oid += "." + value;
      }
      return { oid, index };
    }
    function expectASN1Seq(data, index) {
      if (data[index++] !== 48) throw x509Error("non-sequence data", data);
      return readASN1Length(data, index);
    }
    function signatureAlgorithmHashFromCertificate(data, index) {
      if (index === void 0) index = 0;
      index = expectASN1Seq(data, index).index;
      const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
      index = indexAfterCertInfoLength + certInfoLength;
      index = expectASN1Seq(data, index).index;
      const { oid, index: indexAfterOID } = readASN1OID(data, index);
      switch (oid) {
        // RSA
        case "1.2.840.113549.1.1.4":
          return "MD5";
        case "1.2.840.113549.1.1.5":
          return "SHA-1";
        case "1.2.840.113549.1.1.11":
          return "SHA-256";
        case "1.2.840.113549.1.1.12":
          return "SHA-384";
        case "1.2.840.113549.1.1.13":
          return "SHA-512";
        case "1.2.840.113549.1.1.14":
          return "SHA-224";
        case "1.2.840.113549.1.1.15":
          return "SHA512-224";
        case "1.2.840.113549.1.1.16":
          return "SHA512-256";
        // ECDSA
        case "1.2.840.10045.4.1":
          return "SHA-1";
        case "1.2.840.10045.4.3.1":
          return "SHA-224";
        case "1.2.840.10045.4.3.2":
          return "SHA-256";
        case "1.2.840.10045.4.3.3":
          return "SHA-384";
        case "1.2.840.10045.4.3.4":
          return "SHA-512";
        // RSASSA-PSS: hash is indicated separately
        case "1.2.840.113549.1.1.10": {
          index = indexAfterOID;
          index = expectASN1Seq(data, index).index;
          if (data[index++] !== 160) throw x509Error("non-tag data", data);
          index = readASN1Length(data, index).index;
          index = expectASN1Seq(data, index).index;
          const { oid: hashOID } = readASN1OID(data, index);
          switch (hashOID) {
            // standalone hash OIDs
            case "1.2.840.113549.2.5":
              return "MD5";
            case "1.3.14.3.2.26":
              return "SHA-1";
            case "2.16.840.1.101.3.4.2.1":
              return "SHA-256";
            case "2.16.840.1.101.3.4.2.2":
              return "SHA-384";
            case "2.16.840.1.101.3.4.2.3":
              return "SHA-512";
          }
          throw x509Error("unknown hash OID " + hashOID, data);
        }
        // Ed25519 -- see https://github.com/openssl/openssl/issues/15477
        case "1.3.101.110":
        case "1.3.101.112":
          return "SHA-512";
        // Ed448 -- still not in pg 17.2 (if supported, digest would be SHAKE256 x 64 bytes)
        case "1.3.101.111":
        case "1.3.101.113":
          throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
      }
      throw x509Error("unknown OID " + oid, data);
    }
    module2.exports = { signatureAlgorithmHashFromCertificate };
  }
});

// node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS({
  "node_modules/pg/lib/crypto/sasl.js"(exports2, module2) {
    "use strict";
    var crypto2 = require_utils2();
    var { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
    function saslprep(password) {
      const nonAsciiSpace = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g;
      const mappedToNothing = /[\u00AD\u034F\u1806\u180B\u180C\u180D\u200C\u200D\u2060\uFE00-\uFE0F\uFEFF]/g;
      return password.replace(nonAsciiSpace, " ").replace(mappedToNothing, "").normalize("NFKC");
    }
    var DEFAULT_MAX_SCRAM_ITERATIONS = 1e5;
    function startSession(mechanisms, stream, scramMaxIterations = DEFAULT_MAX_SCRAM_ITERATIONS) {
      const candidates = ["SCRAM-SHA-256"];
      if (stream) candidates.unshift("SCRAM-SHA-256-PLUS");
      const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
      if (!mechanism) {
        throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
      }
      if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") {
        throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
      }
      const clientNonce = crypto2.randomBytes(18).toString("base64");
      const gs2Header = mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n";
      return {
        mechanism,
        clientNonce,
        response: gs2Header + ",,n=*,r=" + clientNonce,
        message: "SASLInitialResponse",
        scramMaxIterations
      };
    }
    async function continueSession(session, password, serverData, stream) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      const scramMaxIterations = typeof session.scramMaxIterations === "number" ? session.scramMaxIterations : DEFAULT_MAX_SCRAM_ITERATIONS;
      if (scramMaxIterations !== 0 && sv.iteration > scramMaxIterations) {
        throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration count " + sv.iteration + " exceeds scramMaxIterations of " + scramMaxIterations
        );
      }
      const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      let channelBinding = stream ? "eSws" : "biws";
      if (session.mechanism === "SCRAM-SHA-256-PLUS") {
        const peerCert = stream.getPeerCertificate().raw;
        let hashName = signatureAlgorithmHashFromCertificate(peerCert);
        if (hashName === "MD5" || hashName === "SHA-1") hashName = "SHA-256";
        const certHash = await crypto2.hashByName(hashName, peerCert);
        const bindingData = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]);
        channelBinding = bindingData.toString("base64");
      }
      const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
      const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      const saltBytes = Buffer.from(sv.salt, "base64");
      const saltedPassword = await crypto2.deriveKey(saslprep(password), saltBytes, sv.iteration);
      const clientKey = await crypto2.hmacSha256(saltedPassword, "Client Key");
      const storedKey = await crypto2.sha256(clientKey);
      const clientSignature = await crypto2.hmacSha256(storedKey, authMessage);
      const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      const serverKey = await crypto2.hmacSha256(saltedPassword, "Server Key");
      const serverSignatureBytes = await crypto2.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    function isPrintableChars(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    function isBase64(text) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
    }
    function parseAttributePairs(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const error = attrPairs.get("e");
      const serverSignature = attrPairs.get("v");
      if (error) {
        throw new Error(`SASL: SCRAM-SERVER-FINAL-MESSAGE: server returned error: "${error}"`);
      }
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    function xorBuffers(a, b) {
      if (!Buffer.isBuffer(a)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a.length !== b.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
    }
    module2.exports = {
      startSession,
      continueSession,
      finalizeSession,
      DEFAULT_MAX_SCRAM_ITERATIONS
    };
  }
});

// node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS({
  "node_modules/pg/lib/type-overrides.js"(exports2, module2) {
    "use strict";
    var types = require_pg_types();
    function TypeOverrides(userTypes) {
      this._types = userTypes || types;
      this.text = {};
      this.binary = {};
    }
    TypeOverrides.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides.prototype.setTypeParser = function(oid, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid] = parseFn;
    };
    TypeOverrides.prototype.getTypeParser = function(oid, format) {
      format = format || "text";
      return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
    };
    module2.exports = TypeOverrides;
  }
});

// node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS({
  "node_modules/pg-connection-string/index.js"(exports2, module2) {
    "use strict";
    function parse(str2, options = {}) {
      if (str2.charAt(0) === "/") {
        const config2 = str2.split(" ");
        return { host: config2[0], database: config2[1] };
      }
      const config = /* @__PURE__ */ Object.create(null);
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str2)) {
        str2 = encodeURI(str2).replace(/%25(\d\d)/g, "%$1");
      }
      try {
        try {
          result = new URL(str2, "postgres://base");
        } catch (e) {
          result = new URL(str2.replace("@/", "@___DUMMY___/"), "postgres://base");
          dummyHost = true;
        }
      } catch (err) {
        err.input && (err.input = "*****REDACTED*****");
        throw err;
      }
      for (const entry of result.searchParams.entries()) {
        config[entry[0]] = entry[1];
      }
      config.user = config.user || decodeURIComponent(result.username);
      config.password = config.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config.host = decodeURI(result.pathname);
        config.database = result.searchParams.get("db");
        config.client_encoding = result.searchParams.get("encoding");
        return config;
      }
      const hostname = (dummyHost ? "" : result.hostname).replace(/^\[(.+)\]$/, "$1");
      if (!config.host) {
        config.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config.port) {
        config.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config.database = pathname ? decodeURI(pathname) : null;
      if (config.ssl === "true" || config.ssl === "1") {
        config.ssl = true;
      }
      if (config.ssl === "0") {
        config.ssl = false;
      }
      if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
        config.ssl = {};
      }
      if (config.sslnegotiation === "direct" && config.ssl === void 0) {
        config.ssl = true;
      }
      const fs2 = config.sslcert || config.sslkey || config.sslrootcert ? require("fs") : null;
      if (config.sslcert) {
        config.ssl.cert = fs2.readFileSync(config.sslcert).toString();
      }
      if (config.sslkey) {
        config.ssl.key = fs2.readFileSync(config.sslkey).toString();
      }
      if (config.sslrootcert) {
        config.ssl.ca = fs2.readFileSync(config.sslrootcert).toString();
      }
      if (options.useLibpqCompat && config.uselibpqcompat) {
        throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
      }
      if (config.uselibpqcompat === "true" || options.useLibpqCompat) {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
          case "require": {
            if (config.sslrootcert) {
              config.ssl.checkServerIdentity = function() {
              };
            } else {
              config.ssl.rejectUnauthorized = false;
            }
            break;
          }
          case "verify-ca": {
            if (!config.ssl.ca) {
              throw new Error(
                "SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security."
              );
            }
            config.ssl.checkServerIdentity = function() {
            };
            break;
          }
          case "verify-full": {
            break;
          }
        }
      } else {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full": {
            if (config.sslmode !== "verify-full") {
              deprecatedSslModeWarning(config.sslmode);
            }
            break;
          }
          case "no-verify": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
        }
      }
      return config;
    }
    function toConnectionOptions(sslConfig) {
      const connectionOptions = Object.entries(sslConfig).reduce((c, [key, value]) => {
        if (value !== void 0 && value !== null) {
          c[key] = value;
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return connectionOptions;
    }
    function toClientConfig(config) {
      const poolConfig = Object.entries(config).reduce((c, [key, value]) => {
        if (key === "ssl") {
          const sslConfig = value;
          if (typeof sslConfig === "boolean") {
            c[key] = sslConfig;
          }
          if (typeof sslConfig === "object") {
            c[key] = toConnectionOptions(sslConfig);
          }
        } else if (value !== void 0 && value !== null) {
          if (key === "port") {
            if (value !== "") {
              const v = parseInt(value, 10);
              if (isNaN(v)) {
                throw new Error(`Invalid ${key}: ${value}`);
              }
              c[key] = v;
            }
          } else {
            c[key] = value;
          }
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return poolConfig;
    }
    function parseIntoClientConfig(str2) {
      return toClientConfig(parse(str2));
    }
    function deprecatedSslModeWarning(sslmode) {
      if (!deprecatedSslModeWarning.warned && typeof process !== "undefined" && process.emitWarning) {
        deprecatedSslModeWarning.warned = true;
        process.emitWarning(`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=${sslmode}'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.`);
      }
    }
    module2.exports = parse;
    parse.parse = parse;
    parse.toClientConfig = toClientConfig;
    parse.parseIntoClientConfig = parseIntoClientConfig;
  }
});

// node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS({
  "node_modules/pg/lib/connection-parameters.js"(exports2, module2) {
    "use strict";
    var dns = require("dns");
    var defaults = require_defaults();
    var parse = require_pg_connection_string().parse;
    var val = function(key, config, envVar) {
      if (config[key]) {
        return config[key];
      }
      if (envVar === void 0) {
        envVar = process.env["PG" + key.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return envVar || defaults[key];
    };
    var readSSLConfigFromEnvironment = function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults.ssl;
    };
    var quoteParamValue = function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    };
    var add = function(params, config, paramName) {
      const value = config[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    };
    var ConnectionParameters = class {
      constructor(config) {
        config = typeof config === "string" ? parse(config) : config || {};
        if (config.connectionString) {
          config = Object.assign({}, config, parse(config.connectionString));
        }
        this.user = val("user", config);
        this.database = val("database", config);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config), 10);
        this.host = val("host", config);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config)
        });
        this.binary = val("binary", config);
        this.options = val("options", config);
        this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.sslnegotiation = val("sslnegotiation", config, "PGSSLNEGOTIATION");
        if (this.sslnegotiation !== void 0 && this.sslnegotiation !== "postgres" && this.sslnegotiation !== "direct") {
          throw new Error(
            `Invalid sslnegotiation value: "${this.sslnegotiation}". Valid values are "postgres" and "direct".`
          );
        }
        if (this.sslnegotiation === "direct" && !this.ssl) {
          throw new Error("sslnegotiation=direct requires SSL to be enabled");
        }
        this.client_encoding = val("client_encoding", config);
        this.replication = val("replication", config);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config, false);
        this.statement_timeout = val("statement_timeout", config, false);
        this.lock_timeout = val("lock_timeout", config, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
        this.query_timeout = val("query_timeout", config, false);
        if (config.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1e3);
        }
        if (config.keepAlive === false) {
          this.keepalives = 0;
        } else if (config.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        const params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        add(params, this, "sslnegotiation");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address) {
          if (err) return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address));
          return cb(null, params.join(" "));
        });
      }
    };
    module2.exports = ConnectionParameters;
  }
});

// node_modules/pg/lib/result.js
var require_result = __commonJS({
  "node_modules/pg/lib/result.js"(exports2, module2) {
    "use strict";
    var types = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result = class {
      constructor(rowMode, types2) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types2;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        let match;
        if (msg.text) {
          match = matchRegexp.exec(msg.text);
        } else {
          match = matchRegexp.exec(msg.command);
        }
        if (match) {
          this.command = match[1];
          if (match[3]) {
            this.oid = parseInt(match[2], 10);
            this.rowCount = parseInt(match[3], 10);
          } else if (match[2]) {
            this.rowCount = parseInt(match[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        const row = new Array(rowData.length);
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        const row = { ...this._prebuiltEmptyResultObject };
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          const field = this.fields[i].name;
          if (rawValue !== null) {
            const v = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
            row[field] = this._parsers[i](v);
          } else {
            row[field] = null;
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        const row = /* @__PURE__ */ Object.create(null);
        for (let i = 0; i < fieldDescriptions.length; i++) {
          const desc = fieldDescriptions[i];
          row[desc.name] = null;
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module2.exports = Result;
  }
});

// node_modules/pg/lib/query.js
var require_query = __commonJS({
  "node_modules/pg/lib/query.js"(exports2, module2) {
    "use strict";
    var { EventEmitter } = require("events");
    var Result = require_result();
    var utils = require_utils();
    var Query = class extends EventEmitter {
      constructor(config, values, callback) {
        super();
        config = utils.normalizeQueryConfig(config, values, callback);
        this.text = config.text;
        this.values = config.values;
        this.rows = config.rows;
        this.types = config.types;
        this.name = config.name;
        this.queryMode = config.queryMode;
        this.binary = config.binary;
        this.portal = config.portal || "";
        this.callback = config.callback;
        this._rowMode = config.rowMode;
        if (process.domain && config.callback) {
          this.callback = process.domain.bind(config.callback);
        }
        this._result = new Result(this._rowMode, this.types);
        this._results = this._result;
        this._canceledDueToError = false;
      }
      requiresPreparation() {
        if (this.queryMode === "extended") {
          return true;
        }
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result(this._rowMode, this._result._types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the initial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name] || connection.submittedNamedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          connection.stream.cork && connection.stream.cork();
          try {
            this.prepare(connection);
          } finally {
            connection.stream.uncork && connection.stream.uncork();
          }
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && (connection.parsedStatements[this.name] !== void 0 || connection.submittedNamedStatements[this.name] !== void 0);
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
          if (this.name) {
            connection.submittedNamedStatements[this.name] = this.text;
          }
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          connection.close({ type: "S", name: this.name });
          connection.sync();
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      handleCopyData(msg, connection) {
      }
    };
    module2.exports = Query;
  }
});

// node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS({
  "node_modules/pg-protocol/dist/messages.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NoticeMessage = exports2.DataRowMessage = exports2.CommandCompleteMessage = exports2.ReadyForQueryMessage = exports2.NotificationResponseMessage = exports2.BackendKeyDataMessage = exports2.AuthenticationMD5Password = exports2.ParameterStatusMessage = exports2.ParameterDescriptionMessage = exports2.RowDescriptionMessage = exports2.Field = exports2.CopyResponse = exports2.CopyDataMessage = exports2.DatabaseError = exports2.copyDone = exports2.emptyQuery = exports2.replicationStart = exports2.portalSuspended = exports2.noData = exports2.closeComplete = exports2.bindComplete = exports2.parseComplete = void 0;
    exports2.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports2.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports2.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports2.noData = {
      name: "noData",
      length: 5
    };
    exports2.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports2.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports2.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports2.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError = class extends Error {
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports2.DatabaseError = DatabaseError;
    var CopyDataMessage = class {
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports2.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports2.CopyResponse = CopyResponse;
    var Field = class {
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports2.Field = Field;
    var RowDescriptionMessage = class {
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports2.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports2.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports2.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports2.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports2.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      constructor(length, processId, channel, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports2.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports2.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      constructor(length, text) {
        this.length = length;
        this.text = text;
        this.name = "commandComplete";
      }
    };
    exports2.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      constructor(length, fields) {
        this.length = length;
        this.fields = fields;
        this.name = "dataRow";
        this.fieldCount = fields.length;
      }
    };
    exports2.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports2.NoticeMessage = NoticeMessage;
  }
});

// node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS({
  "node_modules/pg-protocol/dist/buffer-writer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Writer = void 0;
    var Writer = class {
      constructor(size = 256) {
        this.size = size;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size);
      }
      ensure(size) {
        const remaining = this.buffer.length - this.offset;
        if (remaining < size) {
          const oldBuffer = this.buffer;
          const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer, 0, 0, this.offset);
        }
      }
      addInt32(num2) {
        this.ensure(4);
        this.buffer[this.offset++] = num2 >>> 24 & 255;
        this.buffer[this.offset++] = num2 >>> 16 & 255;
        this.buffer[this.offset++] = num2 >>> 8 & 255;
        this.buffer[this.offset++] = num2 >>> 0 & 255;
        return this;
      }
      addInt16(num2) {
        this.ensure(2);
        this.buffer[this.offset++] = num2 >>> 8 & 255;
        this.buffer[this.offset++] = num2 >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          const len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        const len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      // Write an Int32 byte-length prefix immediately followed by the string's UTF-8
      // bytes. Postgres' Bind wire format prefixes every parameter with its length,
      // and doing it in one method computes Buffer.byteLength ONCE — the previous
      // `addInt32(Buffer.byteLength(s)).addString(s)` pairing scanned the string
      // three times (byteLength for the prefix, byteLength again inside addString,
      // then the encode), which is costly for large text parameters.
      addInt32PrefixedString(string) {
        const len = Buffer.byteLength(string);
        this.ensure(4 + len);
        const buffer = this.buffer;
        let offset = this.offset;
        buffer[offset++] = len >>> 24 & 255;
        buffer[offset++] = len >>> 16 & 255;
        buffer[offset++] = len >>> 8 & 255;
        buffer[offset++] = len >>> 0 & 255;
        buffer.write(string, offset, "utf-8");
        this.offset = offset + len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      /**
       * Appends an uninitialized block of {@link size} bytes to the buffer and returns its offset.
       */
      reserveUnsafe(size) {
        const offset = this.offset;
        this.ensure(size);
        this.offset += size;
        return offset;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        const result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
      clear() {
        this.offset = 5;
        this.headerPosition = 0;
      }
    };
    exports2.Writer = Writer;
  }
});

// node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS({
  "node_modules/pg-protocol/dist/serializer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = (opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key of Object.keys(opts)) {
        writer.addCString(key).addCString(opts[key]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      const bodyBuffer = writer.addCString("").flush();
      const length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    };
    var requestSsl = () => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    };
    var password = (password2) => {
      return writer.addCString(password2).flush(
        112
        /* code.startup */
      );
    };
    var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32PrefixedString(initialResponse);
      return writer.flush(
        112
        /* code.startup */
      );
    };
    var sendSCRAMClientFinalMessage = function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* code.startup */
      );
    };
    var query = (text) => {
      return writer.addCString(text).flush(
        81
        /* code.query */
      );
    };
    var emptyArray = [];
    var parse = (query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types = query2.types || emptyArray;
      const len = types.length;
      const buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (let i = 0; i < len; i++) {
        buffer.addInt32(types[i]);
      }
      return writer.flush(
        80
        /* code.parse */
      );
    };
    var writeValues = function(values, valueMapper, formatsOffset) {
      const len = values.length;
      for (let i = 0; i < len; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        let formatByte = 0;
        if (mappedVal == null) {
          writer.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          formatByte = 1;
          writer.addInt32(mappedVal.length);
          writer.add(mappedVal);
        } else {
          writer.addInt32PrefixedString(mappedVal);
        }
        const buf = writer.buffer;
        buf[formatsOffset++] = 0;
        buf[formatsOffset++] = formatByte;
      }
    };
    var bind = (config = {}) => {
      const portal = config.portal || "";
      const statement = config.statement || "";
      const binary = config.binary || false;
      const values = config.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      const formatsOffset = writer.reserveUnsafe(len * 2);
      writer.addInt16(len);
      try {
        writeValues(values, config.valueMapper, formatsOffset);
      } catch (err) {
        writer.clear();
        throw err;
      }
      writer.addInt16(1);
      writer.addInt16(
        binary ? 1 : 0
        /* ParamType.STRING */
      );
      return writer.flush(
        66
        /* code.bind */
      );
    };
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute = (config) => {
      if (!config || !config.portal && !config.rows) {
        return emptyExecute;
      }
      const portal = config.portal || "";
      const rows = config.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    };
    var cancel = (processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    };
    var cstringMessage = (code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    };
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* code.describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* code.describe */
    );
    var describe = (msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    };
    var close = (msg) => {
      const text = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text);
    };
    var copyData = (chunk) => {
      return writer.add(chunk).flush(
        100
        /* code.copyFromChunk */
      );
    };
    var copyFail = (message) => {
      return cstringMessage(102, message);
    };
    var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
    var flushBuffer = codeOnlyBuffer(
      72
      /* code.flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* code.sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* code.end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* code.copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse,
      bind,
      execute,
      describe,
      close,
      flush: () => flushBuffer,
      sync: () => syncBuffer,
      end: () => endBuffer,
      copyData,
      copyDone: () => copyDoneBuffer,
      copyFail,
      cancel
    };
    exports2.serialize = serialize;
  }
});

// node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS({
  "node_modules/pg-protocol/dist/buffer-reader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BufferReader = void 0;
    var BufferReader = class {
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = Buffer.allocUnsafe(0);
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      uint32() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start = this.offset;
        let end = start;
        while (this.buffer[end++]) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports2.BufferReader = BufferReader;
  }
});

// node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS({
  "node_modules/pg-protocol/dist/parser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var LATEINIT_LENGTH = -1;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        const { reader } = this;
        reader.setBuffer(offset, bytes);
        let message;
        switch (code) {
          case 50:
            message = messages_1.bindComplete;
            break;
          case 49:
            message = messages_1.parseComplete;
            break;
          case 51:
            message = messages_1.closeComplete;
            break;
          case 110:
            message = messages_1.noData;
            break;
          case 115:
            message = messages_1.portalSuspended;
            break;
          case 99:
            message = messages_1.copyDone;
            break;
          case 87:
            message = messages_1.replicationStart;
            break;
          case 73:
            message = messages_1.emptyQuery;
            break;
          case 68:
            message = parseDataRowMessage(reader);
            break;
          case 67:
            message = parseCommandCompleteMessage(reader);
            break;
          case 90:
            message = parseReadyForQueryMessage(reader);
            break;
          case 65:
            message = parseNotificationMessage(reader);
            break;
          case 82:
            message = parseAuthenticationResponse(reader, length);
            break;
          case 83:
            message = parseParameterStatusMessage(reader);
            break;
          case 75:
            message = parseBackendKeyData(reader);
            break;
          case 69:
            message = parseErrorMessage(reader, "error");
            break;
          case 78:
            message = parseErrorMessage(reader, "notice");
            break;
          case 84:
            message = parseRowDescriptionMessage(reader);
            break;
          case 116:
            message = parseParameterDescriptionMessage(reader);
            break;
          case 71:
            message = parseCopyInMessage(reader);
            break;
          case 72:
            message = parseCopyOutMessage(reader);
            break;
          case 100:
            message = parseCopyData(reader, length);
            break;
          default:
            return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
        }
        reader.setBuffer(0, emptyBuffer);
        message.length = length;
        return message;
      }
    };
    exports2.Parser = Parser;
    var parseReadyForQueryMessage = (reader) => {
      const status = reader.string(1);
      return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
    };
    var parseCommandCompleteMessage = (reader) => {
      const text = reader.cstring();
      return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text);
    };
    var parseCopyData = (reader, length) => {
      const chunk = reader.bytes(length - 4);
      return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
    };
    var parseCopyInMessage = (reader) => parseCopyMessage(reader, "copyInResponse");
    var parseCopyOutMessage = (reader) => parseCopyMessage(reader, "copyOutResponse");
    var parseCopyMessage = (reader, messageName) => {
      const isBinary = reader.byte() !== 0;
      const columnCount = reader.int16();
      const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
      for (let i = 0; i < columnCount; i++) {
        message.columnTypes[i] = reader.int16();
      }
      return message;
    };
    var parseNotificationMessage = (reader) => {
      const processId = reader.int32();
      const channel = reader.cstring();
      const payload = reader.cstring();
      return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
    };
    var parseRowDescriptionMessage = (reader) => {
      const fieldCount = reader.int16();
      const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        message.fields[i] = parseField(reader);
      }
      return message;
    };
    var parseField = (reader) => {
      const name = reader.cstring();
      const tableID = reader.uint32();
      const columnID = reader.int16();
      const dataTypeID = reader.uint32();
      const dataTypeSize = reader.int16();
      const dataTypeModifier = reader.int32();
      const mode = reader.int16() === 0 ? "text" : "binary";
      return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
    };
    var parseParameterDescriptionMessage = (reader) => {
      const parameterCount = reader.int16();
      const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
      for (let i = 0; i < parameterCount; i++) {
        message.dataTypeIDs[i] = reader.uint32();
      }
      return message;
    };
    var parseDataRowMessage = (reader) => {
      const fieldCount = reader.int16();
      const fields = new Array(fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        const len = reader.int32();
        fields[i] = len === -1 ? null : reader.string(len);
      }
      return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields);
    };
    var parseParameterStatusMessage = (reader) => {
      const name = reader.cstring();
      const value = reader.cstring();
      return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
    };
    var parseBackendKeyData = (reader) => {
      const processID = reader.int32();
      const secretKey = reader.int32();
      return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
    };
    var parseAuthenticationResponse = (reader, length) => {
      const code = reader.int32();
      const message = {
        name: "authenticationOk",
        length
      };
      switch (code) {
        case 0:
          break;
        case 3:
          if (message.length === 8) {
            message.name = "authenticationCleartextPassword";
          }
          break;
        case 5:
          if (message.length === 12) {
            message.name = "authenticationMD5Password";
            const salt = reader.bytes(4);
            return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
          }
          break;
        case 10:
          {
            message.name = "authenticationSASL";
            message.mechanisms = [];
            let mechanism;
            do {
              mechanism = reader.cstring();
              if (mechanism) {
                message.mechanisms.push(mechanism);
              }
            } while (mechanism);
          }
          break;
        case 11:
          message.name = "authenticationSASLContinue";
          message.data = reader.string(length - 8);
          break;
        case 12:
          message.name = "authenticationSASLFinal";
          message.data = reader.string(length - 8);
          break;
        default:
          throw new Error("Unknown authenticationOk message type " + code);
      }
      return message;
    };
    var parseErrorMessage = (reader, name) => {
      const fields = {};
      let fieldType = reader.string(1);
      while (fieldType !== "\0") {
        fields[fieldType] = reader.cstring();
        fieldType = reader.string(1);
      }
      const messageValue = fields.M;
      const message = name === "notice" ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue) : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
      message.severity = fields.S;
      message.code = fields.C;
      message.detail = fields.D;
      message.hint = fields.H;
      message.position = fields.P;
      message.internalPosition = fields.p;
      message.internalQuery = fields.q;
      message.where = fields.W;
      message.schema = fields.s;
      message.table = fields.t;
      message.column = fields.c;
      message.dataType = fields.d;
      message.constraint = fields.n;
      message.file = fields.F;
      message.line = fields.L;
      message.routine = fields.R;
      return message;
    };
  }
});

// node_modules/pg-protocol/dist/index.js
var require_dist = __commonJS({
  "node_modules/pg-protocol/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DatabaseError = exports2.serialize = void 0;
    exports2.parse = parse;
    var messages_1 = require_messages();
    Object.defineProperty(exports2, "DatabaseError", { enumerable: true, get: function() {
      return messages_1.DatabaseError;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports2, "serialize", { enumerable: true, get: function() {
      return serializer_1.serialize;
    } });
    var parser_1 = require_parser();
    function parse(stream, callback) {
      const parser = new parser_1.Parser();
      stream.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream.on("end", () => resolve()));
    }
  }
});

// node_modules/pg-cloudflare/dist/empty.js
var require_empty = __commonJS({
  "node_modules/pg-cloudflare/dist/empty.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = {};
  }
});

// node_modules/pg/lib/stream.js
var require_stream = __commonJS({
  "node_modules/pg/lib/stream.js"(exports2, module2) {
    var { getStream, getSecureStream } = getStreamFuncs();
    module2.exports = {
      /**
       * Get a socket stream compatible with the current runtime environment.
       * @returns {Duplex}
       */
      getStream,
      /**
       * Get a TLS secured socket, compatible with the current environment,
       * using the socket and other settings given in `options`.
       * @returns {Duplex}
       */
      getSecureStream
    };
    function getNodejsStreamFuncs() {
      function getStream2(ssl) {
        const net = require("net");
        return new net.Socket();
      }
      function getSecureStream2(options) {
        const tls = require("tls");
        return tls.connect(options);
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function getCloudflareStreamFuncs() {
      function getStream2(ssl) {
        const { CloudflareSocket } = require_empty();
        return new CloudflareSocket(ssl);
      }
      function getSecureStream2(options) {
        options.socket.startTls(options);
        return options.socket;
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function isCloudflareRuntime() {
      if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") {
        return navigator.userAgent === "Cloudflare-Workers";
      }
      if (typeof Response === "function") {
        const resp = new Response(null, { cf: { thing: true } });
        if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
          return true;
        }
      }
      return false;
    }
    function getStreamFuncs() {
      if (isCloudflareRuntime()) {
        return getCloudflareStreamFuncs();
      }
      return getNodejsStreamFuncs();
    }
  }
});

// node_modules/pg/lib/connection.js
var require_connection = __commonJS({
  "node_modules/pg/lib/connection.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var { parse, serialize } = require_dist();
    var stream = require_stream();
    var { getStream } = stream;
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection = class extends EventEmitter {
      constructor(config) {
        super();
        config = config || {};
        this.stream = config.stream || getStream(config.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config);
        }
        this._keepAlive = config.keepAlive;
        this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
        this.parsedStatements = {};
        this.submittedNamedStatements = {};
        this.ssl = config.ssl || false;
        this.sslNegotiation = config.sslNegotiation || "postgres";
        this._ending = false;
        this._emitMessage = false;
        const self = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self._emitMessage = true;
          }
        });
      }
      connect(port, host) {
        const self = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port, host);
        this.stream.once("connect", function() {
          if (self._keepAlive) {
            self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
          }
          self.emit("connect");
        });
        const reportStreamError = function(error) {
          if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
            return;
          }
          self.emit("error", error);
        };
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        if (this.sslNegotiation === "direct") {
          return this.stream.once("connect", function() {
            self.upgradeToSSL(host, reportStreamError);
          });
        }
        this.stream.once("data", function(buffer) {
          const responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self.stream.end();
              return self.emit("error", new Error("The server does not support SSL connections"));
            default:
              self.stream.end();
              return self.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          self.upgradeToSSL(host, reportStreamError);
        });
      }
      upgradeToSSL(host, reportStreamError) {
        const self = this;
        const options = {
          socket: self.stream,
          // tls.connect checks the server identity against `servername`, falling
          // back to `host` and then to 'localhost'. `servername` must stay unset
          // for IP addresses (see below), so `host` is needed to keep certificate
          // validation working when connecting to an IP address.
          host
        };
        if (self.ssl !== true) {
          Object.assign(options, self.ssl);
          if ("key" in self.ssl) {
            options.key = self.ssl.key;
          }
        }
        if (self.sslNegotiation === "direct") {
          options.ALPNProtocols = ["postgresql"];
        }
        const net = require("net");
        if (net.isIP && net.isIP(host) === 0) {
          options.servername = host;
        }
        try {
          self.stream = stream.getSecureStream(options);
        } catch (err) {
          return self.emit("error", err);
        }
        self.attachListeners(self.stream);
        self.stream.on("error", reportStreamError);
        self.emit("sslconnect");
      }
      attachListeners(stream2) {
        parse(stream2, (msg) => {
          const eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config) {
        this.stream.write(serialize.startup(config));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text) {
        this._send(serialize.query(text));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config) {
        this._send(serialize.bind(config));
      }
      // send execute message
      execute(config) {
        this._send(serialize.execute(config));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module2.exports = Connection;
  }
});

// node_modules/split2/index.js
var require_split2 = __commonJS({
  "node_modules/split2/index.js"(exports2, module2) {
    "use strict";
    var { Transform } = require("stream");
    var { StringDecoder } = require("string_decoder");
    var kLast = Symbol("last");
    var kDecoder = Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1) return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error) {
          return cb(error);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error) {
          return cb(error);
        }
      }
      cb();
    }
    function push(self, val) {
      if (val !== void 0) {
        self.push(val);
      }
    }
    function noop(incoming) {
      return incoming;
    }
    function split(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream = new Transform(options);
      stream[kLast] = "";
      stream[kDecoder] = new StringDecoder("utf8");
      stream.matcher = matcher;
      stream.mapper = mapper;
      stream.maxLength = options.maxLength;
      stream.skipOverflow = options.skipOverflow || false;
      stream.overflow = false;
      stream._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream;
    }
    module2.exports = split;
  }
});

// node_modules/pgpass/lib/helper.js
var require_helper = __commonJS({
  "node_modules/pgpass/lib/helper.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var Stream = require("stream").Stream;
    var split = require_split2();
    var util = require("util");
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG = 56;
    var S_IRWXO = 7;
    var S_IFMT = 61440;
    var S_IFREG = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT) == S_IFREG;
    }
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn() {
      var isWritable = warnStream instanceof Stream && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util.format.apply(util, args));
      }
    }
    Object.defineProperty(module2.exports, "isWin", {
      get: function() {
        return isWin;
      },
      set: function(val) {
        isWin = val;
      }
    });
    module2.exports.warnTo = function(stream) {
      var old = warnStream;
      warnStream = stream;
      return old;
    };
    module2.exports.getFileName = function(rawEnv) {
      var env = rawEnv || process.env;
      var file = env.PGPASSFILE || (isWin ? path.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path.join(env.HOME || "./", ".pgpass"));
      return file;
    };
    module2.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG | S_IRWXO)) {
        warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module2.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module2.exports.getPassword = function(connInfo, stream, cb) {
      var pass;
      var lineStream = stream.pipe(split());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      var onEnd = function() {
        stream.destroy();
        cb(pass);
      };
      var onErr = function(err) {
        stream.destroy();
        warn("WARNING: error on reading file: %s", err);
        cb(void 0);
      };
      stream.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module2.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      };
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module2.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x) {
          return x.length > 0;
        },
        // port
        1: function(x) {
          if (x === "*") {
            return true;
          }
          x = Number(x);
          return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
        },
        // database
        2: function(x) {
          return x.length > 0;
        },
        // username
        3: function(x) {
          return x.length > 0;
        },
        // password
        4: function(x) {
          return x.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});

// node_modules/pgpass/lib/index.js
var require_lib = __commonJS({
  "node_modules/pgpass/lib/index.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var fs2 = require("fs");
    var helper = require_helper();
    module2.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs2.stat(file, function(err, stat) {
        if (err || !helper.usePgPass(stat, file)) {
          return cb(void 0);
        }
        var st = fs2.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module2.exports.warnTo = helper.warnTo;
  }
});

// node_modules/pg/lib/client.js
var require_client = __commonJS({
  "node_modules/pg/lib/client.js"(exports2, module2) {
    var EventEmitter = require("events").EventEmitter;
    var utils = require_utils();
    var nodeUtils = require("util");
    var sasl = require_sasl();
    var TypeOverrides = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query = require_query();
    var defaults = require_defaults();
    var Connection = require_connection();
    var crypto2 = require_utils2();
    var activeQueryDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.activeQuery is deprecated and will be removed in pg@9.0"
    );
    var queryQueueDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.queryQueue is deprecated and will be removed in pg@9.0."
    );
    var pgPassDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "pgpass support is deprecated and will be removed in pg@9.0. You can provide an async function as the password property to the Client/Pool constructor that returns a password instead. Within this function you can call the pgpass module in your own code."
    );
    var byoPromiseDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Passing a custom Promise implementation to the Client/Pool constructor is deprecated and will be removed in pg@9.0."
    );
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    function coerceNumberOrDefault(value, defaultValue) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : defaultValue;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : defaultValue;
      }
      return defaultValue;
    }
    var Client = class extends EventEmitter {
      constructor(config) {
        super();
        this.connectionParameters = new ConnectionParameters(config);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        const c = config || {};
        if (c.Promise) {
          byoPromiseDeprecationNotice();
        }
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this._activeQuery = null;
        this._txStatus = null;
        this.enableChannelBinding = Boolean(c.enableChannelBinding);
        this.scramMaxIterations = coerceNumberOrDefault(c.scramMaxIterations, sasl.DEFAULT_MAX_SCRAM_ITERATIONS);
        this.connection = c.connection || new Connection({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          sslNegotiation: this.connectionParameters.sslnegotiation,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this._queryQueue = [];
        this._sentQueryQueue = [];
        this.pipeline = Boolean(c.pipeline);
        this.binary = c.binary || defaults.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        this.sslNegotiation = this.connectionParameters.sslnegotiation || "postgres";
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      get activeQuery() {
        activeQueryDeprecationNotice();
        return this._activeQuery;
      }
      set activeQuery(val) {
        activeQueryDeprecationNotice();
        this._activeQuery = val;
      }
      _getActiveQuery() {
        return this._activeQuery;
      }
      _errorAllQueries(err) {
        const enqueueError = (query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        };
        const activeQuery = this._getActiveQuery();
        if (activeQuery) {
          enqueueError(activeQuery);
          this._activeQuery = null;
        }
        this._sentQueryQueue.forEach(enqueueError);
        this._sentQueryQueue.length = 0;
        this._queryQueue.forEach(enqueueError);
        this._queryQueue.length = 0;
      }
      _connect(callback) {
        const self = this;
        const con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
          if (this.connectionTimeoutHandle.unref) {
            this.connectionTimeoutHandle.unref();
          }
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self.ssl) {
            if (self.sslNegotiation !== "direct") {
              con.requestSsl();
            }
          } else {
            con.startup(self.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error);
              } else {
                this._handleErrorEvent(error);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error) => {
            if (error) {
              reject(error);
            } else {
              resolve(this);
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      _getPassword(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password(this.connectionParameters)).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                pgPassDeprecationNotice();
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._getPassword(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._getPassword(async () => {
          try {
            const hashedPassword = await crypto2.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._getPassword(() => {
          try {
            this.saslSession = sasl.startSession(
              msg.mechanisms,
              this.enableChannelBinding && this.connection.stream,
              this.scramMaxIterations
            );
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(
            this.saslSession,
            this.password,
            msg.data,
            this.enableChannelBinding && this.connection.stream
          );
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const activeQuery = this._getActiveQuery();
        this._activeQuery = null;
        this._txStatus = msg?.status ?? null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receive an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this._getActiveQuery();
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this._activeQuery = null;
        if (activeQuery.name) {
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected rowDescription message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected dataRow message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected portalSuspended message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected emptyQuery message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected commandComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete() {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected parseComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        if (activeQuery.name) {
          this.connection.parsedStatements[activeQuery.name] = activeQuery.text;
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
      }
      _handleCopyInResponse(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyInResponse message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyData message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        const params = this.connectionParameters;
        const data = {
          user: params.user,
          database: params.database
        };
        const appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client, query) {
        if (client.activeQuery === query) {
          const con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client.processID, client.secretKey);
          });
        } else if (client._queryQueue.indexOf(query) !== -1) {
          client._queryQueue.splice(client._queryQueue.indexOf(query), 1);
        } else if (client._sentQueryQueue.indexOf(query) !== -1) {
          query.callback = () => {
          };
        }
      }
      setTypeParser(oid, format, parseFn) {
        return this._types.setTypeParser(oid, format, parseFn);
      }
      getTypeParser(oid, format) {
        return this._types.getTypeParser(oid, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str2) {
        return utils.escapeIdentifier(str2);
      }
      escapeLiteral(str2) {
        return utils.escapeLiteral(str2);
      }
      _pulseQueryQueue() {
        if (this.pipeline) {
          this._pulsePipelinedQueryQueue();
          return;
        }
        if (this.readyForQuery === true) {
          this._activeQuery = this._queryQueue.shift();
          const activeQuery = this._getActiveQuery();
          if (activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this._activeQuery = null;
            this.emit("drain");
          }
        }
      }
      _pulsePipelinedQueryQueue() {
        if (!this._connected || !this._queryable) {
          return;
        }
        while (this._queryQueue.length > 0) {
          const query = this._queryQueue.shift();
          this.hasExecuted = true;
          const queryError = query.submit(this.connection);
          if (queryError) {
            process.nextTick(() => {
              query.handleError(queryError, this.connection);
            });
            continue;
          }
          this._sentQueryQueue.push(query);
        }
        if (this.readyForQuery && !this._activeQuery && this._sentQueryQueue.length > 0) {
          this._activeQuery = this._sentQueryQueue.shift();
          this.readyForQuery = false;
        }
        if (!this._activeQuery && this._sentQueryQueue.length === 0 && this._queryQueue.length === 0 && this.hasExecuted) {
          this.emit("drain");
        }
      }
      query(config, values, callback) {
        let query;
        let result;
        if (config == null) {
          throw new TypeError("Client was passed a null or undefined query");
        }
        if (typeof config.submit === "function") {
          result = query = config;
          if (!query.callback) {
            if (typeof values === "function") {
              query.callback = values;
            } else if (callback) {
              query.callback = callback;
            }
          }
        } else {
          query = new Query(config, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          } else if (typeof query.callback !== "function") {
            throw new TypeError("callback is not a function");
          }
        }
        const readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        if (readTimeout) {
          const queryCallback = query.callback || (() => {
          });
          const readTimeoutTimer = setTimeout(() => {
            const error = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error, this.connection);
            });
            queryCallback(error);
            query.callback = () => {
            };
            const index = this._queryQueue.indexOf(query);
            if (index > -1) {
              this._queryQueue.splice(index, 1);
            } else if (this.pipeline) {
              this.connection.stream.destroy();
              return;
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (this.pipeline) {
          const portalQuery = typeof config.submit === "function" && !(query instanceof Query) ? "Custom query classes such as pg-cursor and pg-query-stream are" : query.rows ? "The `rows` option is" : null;
          if (portalQuery) {
            process.nextTick(() => {
              query.handleError(new Error(`${portalQuery} not supported in pipeline mode`), this.connection);
            });
            return result;
          }
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._queryQueue.length > 0 && !this.pipeline) {
          queryQueueLengthDeprecationNotice();
        }
        this._queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      getTransactionStatus() {
        return this._txStatus;
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
            return;
          } else {
            return this._Promise.resolve();
          }
        }
        if (!this._queryable) {
          this.connection.stream.destroy();
        } else if (this.pipeline && (this._getActiveQuery() || this._sentQueryQueue.length > 0 || this._queryQueue.length > 0)) {
          this.once("drain", () => this.connection.end());
        } else if (this._getActiveQuery()) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
      get queryQueue() {
        queryQueueDeprecationNotice();
        return this._queryQueue;
      }
    };
    Client.Query = Query;
    module2.exports = Client;
  }
});

// node_modules/pg-pool/index.js
var require_pg_pool = __commonJS({
  "node_modules/pg-pool/index.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var NOOP = function() {
    };
    var removeWhere = (list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    };
    var IdleItem = class {
      constructor(client, idleListener, timeoutId) {
        this.client = client;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    function promisify2(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = function(err, client) {
        err ? rej(err) : res(client);
      };
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    function makeIdleListener(pool2, client) {
      return function idleListener(err) {
        err.client = client;
        client.removeListener("error", idleListener);
        client.on("error", () => {
          pool2.log("additional client error after disconnection due to error", err);
        });
        pool2._remove(client);
        pool2.emit("error", err, client);
      };
    }
    var Pool2 = class extends EventEmitter {
      constructor(options, Client) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.min = this.options.min || 0;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _promiseTry(f) {
        const Promise2 = this.Promise;
        if (typeof Promise2.try === "function") {
          return Promise2.try(f);
        }
        return new Promise2((resolve) => resolve(f()));
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _isAboveMin() {
        return this._clients.length > this.options.min;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client = idleItem.client;
          client.ref && client.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client, callback) {
        const removed = removeWhere(this._idle, (item) => item.client === client);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client);
        const context = this;
        client.end(() => {
          context.emit("remove", client);
          if (typeof callback === "function") {
            callback();
          }
        });
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify2(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = (err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          };
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          if (tid.unref) {
            tid.unref();
          }
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client = new this.Client(this.options);
        this._clients.push(client);
        const idleListener = makeIdleListener(this, client);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            if (client.connection) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.connection.stream.destroy();
            } else if (!client.isConnected()) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.end();
            }
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client);
            if (timeoutHit) {
              err = new Error("Connection terminated due to connection timeout", { cause: err });
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.onConnect) {
              this._promiseTry(() => this.options.onConnect(client)).then(
                () => {
                  this._afterConnect(client, pendingItem, idleListener);
                },
                (hookErr) => {
                  this._clients = this._clients.filter((c) => c !== client);
                  client.end(() => {
                    this._pulseQueue();
                    if (!pendingItem.timedOut) {
                      pendingItem.callback(hookErr, void 0, NOOP);
                    }
                  });
                }
              );
              return;
            }
            return this._afterConnect(client, pendingItem, idleListener);
          }
        });
      }
      _afterConnect(client, pendingItem, idleListener) {
        if (this.options.maxLifetimeSeconds !== 0) {
          const maxLifetimeTimeout = setTimeout(() => {
            this.log("ending client due to expired lifetime");
            this._expired.add(client);
            const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
            if (idleIndex !== -1) {
              this._acquireClient(
                client,
                new PendingItem((err, client2, clientRelease) => clientRelease()),
                idleListener,
                false
              );
            }
          }, this.options.maxLifetimeSeconds * 1e3);
          maxLifetimeTimeout.unref();
          client.once("end", () => clearTimeout(maxLifetimeTimeout));
        }
        return this._acquireClient(client, pendingItem, idleListener, true);
      }
      // acquire a client for a pending work item
      _acquireClient(client, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client);
        }
        this.emit("acquire", client);
        client.release = this._releaseOnce(client, idleListener);
        client.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client, (err) => {
              if (err) {
                client.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client, client.release);
            });
          } else {
            pendingItem.callback(void 0, client, client.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client, client.release);
          } else {
            client.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client, idleListener, err) {
        client.on("error", idleListener);
        client._poolUseCount = (client._poolUseCount || 0) + 1;
        this.emit("release", err, client);
        if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
          if (client._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          return this._remove(client, this._pulseQueue.bind(this));
        }
        const isExpired = this._expired.has(client);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client);
          return this._remove(client, this._pulseQueue.bind(this));
        }
        let tid;
        if (this.options.idleTimeoutMillis && this._isAboveMin()) {
          tid = setTimeout(() => {
            if (this._isAboveMin()) {
              this.log("remove idle client");
              this._remove(client, this._pulseQueue.bind(this));
            }
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client.unref();
        }
        this._idle.push(new IdleItem(client, idleListener, tid));
        this._pulseQueue();
      }
      query(text, values, cb) {
        if (typeof text === "function") {
          const response2 = promisify2(this.Promise, text);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify2(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = (err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err2);
            cb(err2);
          };
          client.once("error", onError);
          this.log("dispatching query");
          try {
            client.query(text, values, (err2, res) => {
              this.log("query dispatched");
              client.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify2(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module2.exports = Pool2;
  }
});

// node_modules/pg/lib/native/query.js
var require_query2 = __commonJS({
  "node_modules/pg/lib/native/query.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var util = require("util");
    var utils = require_utils();
    var NativeQuery = module2.exports = function(config, values, callback) {
      EventEmitter.call(this);
      config = utils.normalizeQueryConfig(config, values, callback);
      this.text = config.text;
      this.values = config.values;
      this.name = config.name;
      this.queryMode = config.queryMode;
      this.callback = config.callback;
      this.state = "new";
      this._arrayMode = config.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row") this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util.inherits(NativeQuery, EventEmitter);
    var errorFieldMap = {
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      messageDetail: "detail",
      messageHint: "hint",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      const fields = this.native && this.native.pq.resultErrorFields();
      if (fields) {
        for (const key in fields) {
          const normalizedFieldName = errorFieldMap[key] || key;
          err[normalizedFieldName] = fields[key];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise) return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client) {
      this.state = "running";
      const self = this;
      this.native = client.native;
      client.native.arrayMode = this._arrayMode;
      let after = function(err, rows, results) {
        client.native.arrayMode = false;
        setImmediate(function() {
          self.emit("_done");
        });
        if (err) {
          return self.handleError(err);
        }
        if (self._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self.emit("row", row, results);
            });
          }
        }
        self.state = "end";
        self.emit("end", results);
        if (self.callback) {
          self.callback(null, results);
        }
      };
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        const values = (this.values || []).map(utils.prepareValue);
        if (client.namedQueries[this.name] !== void 0) {
          if (this.text && client.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client.native.execute(this.name, values, after);
        }
        return client.native.prepare(this.name, this.text, values.length, function(err) {
          if (err) return after(err);
          client.namedQueries[self.name] = self.text;
          return self.native.execute(self.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        const vals = this.values.map(utils.prepareValue);
        client.native.query(this.text, vals, after);
      } else if (this.queryMode === "extended") {
        client.native.query(this.text, [], after);
      } else {
        client.native.query(this.text, after);
      }
    };
  }
});

// node_modules/pg/lib/native/client.js
var require_client2 = __commonJS({
  "node_modules/pg/lib/native/client.js"(exports2, module2) {
    var nodeUtils = require("util");
    var Native;
    try {
      Native = require("pg-native");
    } catch (e) {
      throw e;
    }
    var TypeOverrides = require_type_overrides();
    var EventEmitter = require("events").EventEmitter;
    var util = require("util");
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    var Client = module2.exports = function(config) {
      EventEmitter.call(this);
      config = config || {};
      this._Promise = config.Promise || global.Promise;
      this._types = new TypeOverrides(config.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      this.pipeline = Boolean(config.pipeline);
      this._pipelineInFlight = false;
      const cp = this.connectionParameters = new ConnectionParameters(config);
      if (config.nativeConnectionString) cp.nativeConnectionString = config.nativeConnectionString;
      this.user = cp.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp.password
      });
      this.database = cp.database;
      this.host = cp.host;
      this.port = cp.port;
      this.namedQueries = {};
    };
    Client.Query = NativeQuery;
    util.inherits(Client, EventEmitter);
    Client.prototype._errorAllQueries = function(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      };
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client.prototype._connect = function(cb) {
      const self = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self.connectionParameters.nativeConnectionString) conString = self.connectionParameters.nativeConnectionString;
        if (err) return cb(err);
        self.native.connect(conString, function(err2) {
          if (err2) {
            self.native.end();
            return cb(err2);
          }
          self._connected = true;
          self.native.on("error", function(err3) {
            self._queryable = false;
            self._errorAllQueries(err3);
            self.emit("error", err3);
          });
          self.native.on("notification", function(msg) {
            self.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self.emit("connect");
          self._pulseQueryQueue(true);
          cb(null, this);
        });
      });
    };
    Client.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve(this);
          }
        });
      });
    };
    Client.prototype.query = function(config, values, callback) {
      let query;
      let result;
      let readTimeout;
      let readTimeoutTimer;
      let queryCallback;
      if (config === null || config === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config.submit === "function") {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        result = query = config;
        if (typeof values === "function") {
          config.callback = values;
        }
      } else {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        query = new NativeQuery(config, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback || (() => {
        });
        readTimeoutTimer = setTimeout(() => {
          const error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {
          };
          const index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      if (this._queryQueue.length > 0 && !this.pipeline) {
        queryQueueLengthDeprecationNotice();
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client.prototype.end = function(cb) {
      const self = this;
      this._ending = true;
      if (this._connecting && !this._connected) {
        this.once("connect", () => {
          this.end(() => {
          });
        });
      }
      let result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = (err) => err ? reject(err) : resolve();
        });
      }
      const doEnd = function() {
        self.native.end(function() {
          self._connected = false;
          self._errorAllQueries(new Error("Connection terminated"));
          process.nextTick(() => {
            self.emit("end");
            if (cb) cb();
          });
        });
      };
      if (this.pipeline && (this._pipelineInFlight || this._queryQueue.length > 0)) {
        this.once("drain", doEnd);
      } else {
        doEnd();
      }
      return result;
    };
    Client.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this.pipeline && !initialConnection) {
        return this._pulsePipelinedQueryQueue();
      }
      if (this._hasActiveQuery()) {
        return;
      }
      const query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      const self = this;
      query.once("_done", function() {
        self._pulseQueryQueue();
      });
    };
    Client.prototype._pulsePipelinedQueryQueue = function() {
      if (!this._connected || this._pipelineInFlight) {
        return;
      }
      if (this._queryQueue.length === 0) {
        if (this.hasExecuted) {
          this.emit("drain");
        }
        return;
      }
      this._pipelineInFlight = true;
      const self = this;
      const queries = [];
      const nativeQueries = [];
      const utils = require_utils();
      while (this._queryQueue.length > 0) {
        const query = this._queryQueue.shift();
        this.hasExecuted = true;
        nativeQueries.push(query);
        const values = query.values ? query.values.map(utils.prepareValue) : null;
        const pipelineEntry = { text: query.text, name: query.name, arrayMode: query._arrayMode };
        if (values) {
          pipelineEntry.values = values;
        }
        if (query.name && this.namedQueries[query.name]) {
          pipelineEntry._alreadyPrepared = true;
        }
        queries.push(pipelineEntry);
      }
      this.native.pipeline(queries, function(err, results) {
        self._pipelineInFlight = false;
        if (err) {
          self._connected = false;
          self._queryable = false;
          for (let i = 0; i < nativeQueries.length; i++) {
            const q = nativeQueries[i];
            q.native = self.native;
            q.handleError(err);
          }
          self._errorAllQueries(err);
          self.emit("error", err);
          self.emit("end");
          return;
        }
        for (let i = 0; i < nativeQueries.length; i++) {
          const q = nativeQueries[i];
          const r = results[i];
          q.native = self.native;
          if (r.err) {
            q.handleError(r.err);
          } else {
            if (q.name) {
              self.namedQueries[q.name] = q.text;
            }
            q.state = "end";
            q.emit("end", r.result);
            if (q.callback) {
              q.callback(null, r.result);
            }
          }
          setImmediate(function() {
            q.emit("_done");
          });
        }
        self._pulsePipelinedQueryQueue();
      });
    };
    Client.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client.prototype.ref = function() {
    };
    Client.prototype.unref = function() {
    };
    Client.prototype.setTypeParser = function(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    };
    Client.prototype.getTypeParser = function(oid, format) {
      return this._types.getTypeParser(oid, format);
    };
    Client.prototype.isConnected = function() {
      return this._connected;
    };
    Client.prototype.getTransactionStatus = function() {
      return this.native.getTransactionStatus();
    };
  }
});

// node_modules/pg/lib/native/index.js
var require_native = __commonJS({
  "node_modules/pg/lib/native/index.js"(exports2, module2) {
    "use strict";
    module2.exports = require_client2();
  }
});

// node_modules/pg/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/pg/lib/index.js"(exports2, module2) {
    "use strict";
    var Client = require_client();
    var defaults = require_defaults();
    var Connection = require_connection();
    var Result = require_result();
    var utils = require_utils();
    var Pool2 = require_pg_pool();
    var TypeOverrides = require_type_overrides();
    var { DatabaseError } = require_dist();
    var { escapeIdentifier, escapeLiteral } = require_utils();
    var poolFactory = (Client2) => {
      return class BoundPool extends Pool2 {
        constructor(options) {
          super(options, Client2);
        }
      };
    };
    var PG = function(clientConstructor2) {
      this.defaults = defaults;
      this.Client = clientConstructor2;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError;
      this.TypeOverrides = TypeOverrides;
      this.escapeIdentifier = escapeIdentifier;
      this.escapeLiteral = escapeLiteral;
      this.Result = Result;
      this.utils = utils;
    };
    var clientConstructor = Client;
    var forceNative = false;
    try {
      forceNative = !!process.env.NODE_PG_FORCE_NATIVE;
    } catch {
    }
    if (forceNative) {
      clientConstructor = require_native();
    }
    module2.exports = new PG(clientConstructor);
    Object.defineProperty(module2.exports, "native", {
      configurable: true,
      enumerable: false,
      get() {
        let native = null;
        try {
          native = new PG(require_native());
        } catch (err) {
          if (err.code !== "MODULE_NOT_FOUND") {
            throw err;
          }
        }
        Object.defineProperty(module2.exports, "native", {
          value: native
        });
        return native;
      }
    });
  }
});

// src/work.js
var require_work = __commonJS({
  "src/work.js"(exports2, module2) {
    "use strict";
    var crypto2 = require("crypto");
    var fs2 = require("fs");
    var path = require("path");
    var { pipeline } = require("stream/promises");
    var { Transform } = require("stream");
    var STATUSES = ["todo", "doing", "review", "done"];
    var PRIORITIES = ["low", "medium", "high", "urgent"];
    var DEFAULT_WS = "w_default";
    var DEFAULT_DEPT = "d_default";
    var DEFAULT_PROJECT = "p_general";
    var UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";
    var MAX_FILE = Number(process.env.MAX_UPLOAD_MB || 20) * 1024 * 1024;
    var MAX_FILES_PER_TASK = 30;
    var MIME = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
      heic: "image/heic",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      txt: "text/plain; charset=utf-8",
      csv: "text/csv; charset=utf-8",
      rtf: "application/rtf",
      odt: "application/vnd.oasis.opendocument.text",
      ods: "application/vnd.oasis.opendocument.spreadsheet",
      zip: "application/zip"
    };
    var INLINE_EXT = /* @__PURE__ */ new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "pdf"]);
    var pad = (n) => String(n).padStart(2, "0");
    var isoOf = (d) => d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
    var parseISO = (s) => {
      const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    };
    var validISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && isoOf(parseISO(s)) === s;
    var addDays = (d, n) => new Date(d.getTime() + n * 864e5);
    var daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    var isoWeekday = (d) => d.getUTCDay() || 7;
    function cleanRule(r) {
      if (!r || typeof r !== "object" || !["daily", "weekly", "monthly"].includes(r.type)) return null;
      const out = { type: r.type };
      if (r.type === "daily") out.interval = Math.min(365, Math.max(1, Math.floor(Number(r.interval)) || 1));
      if (r.type === "weekly") {
        out.weekdays = [...new Set((Array.isArray(r.weekdays) ? r.weekdays : []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7))].sort((a, b) => a - b);
        if (!out.weekdays.length) return null;
      }
      if (r.type === "monthly") {
        out.monthDay = Math.floor(Number(r.monthDay));
        if (!(out.monthDay >= 1 && out.monthDay <= 31)) return null;
      }
      out.end = validISO(r.end) ? r.end : "";
      return out;
    }
    function nextAfter(rule, d) {
      if (rule.type === "daily") return addDays(d, rule.interval || 1);
      if (rule.type === "weekly") {
        for (let i = 1; i <= 7; i++) {
          const n = addDays(d, i);
          if (rule.weekdays.includes(isoWeekday(n))) return n;
        }
      }
      if (rule.type === "monthly") {
        let y = d.getUTCFullYear(), m = d.getUTCMonth();
        for (let i = 0; i < 25; i++) {
          const cand = new Date(Date.UTC(y, m, Math.min(rule.monthDay, daysInMonth(y, m))));
          if (cand > d) return cand;
          if (++m > 11) {
            m = 0;
            y++;
          }
        }
      }
      throw new Error("C\u1EA5u h\xECnh l\u1EB7p l\u1EA1i kh\xF4ng h\u1EE3p l\u1EC7");
    }
    function nextDue(rule, baseDue, today) {
      let n = nextAfter(rule, validISO(baseDue) ? parseISO(baseDue) : parseISO(today));
      for (let guard = 0; isoOf(n) < today && guard < 2e3; guard++) n = nextAfter(rule, n);
      const out = isoOf(n);
      return rule.end && out > rule.end ? null : out;
    }
    module2.exports = function makeWork(D) {
      const { pool: pool2, AppError: AppError2, deny: deny2, str: str2, num: num2, one: one2, canManage: canManage2, todayISO: todayISO2, ctxFor: ctxFor2 } = D;
      const newId = (p) => p + crypto2.randomBytes(6).toString("hex");
      const uniq = (a) => [...new Set(a)];
      const idList = (v) => uniq((Array.isArray(v) ? v : []).map(str2).filter(Boolean));
      const safeId = (s) => /^[A-Za-z0-9_-]{1,64}$/.test(String(s));
      const SCHEMA2 = `
CREATE TABLE IF NOT EXISTS workspaces (id text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '', color text NOT NULL DEFAULT '#2f6fed',
  open boolean NOT NULL DEFAULT false, archived boolean NOT NULL DEFAULT false, created_by text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE TABLE IF NOT EXISTS workspace_members (workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, user_id text NOT NULL, PRIMARY KEY (workspace_id, user_id));
CREATE TABLE IF NOT EXISTS departments (id text PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, name text NOT NULL,
  head_id text NOT NULL DEFAULT '', seq bigserial);
CREATE TABLE IF NOT EXISTS projects (id text PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, department_id text NOT NULL DEFAULT '',
  name text NOT NULL, description text NOT NULL DEFAULT '', color text NOT NULL DEFAULT '#2f6fed', manager_id text NOT NULL DEFAULT '',
  open boolean NOT NULL DEFAULT false, share_all boolean NOT NULL DEFAULT false, archived boolean NOT NULL DEFAULT false,
  created_by text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE TABLE IF NOT EXISTS project_members (project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id text NOT NULL, PRIMARY KEY (project_id, user_id));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT '${DEFAULT_PROJECT}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks jsonb NOT NULL DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position double precision NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS spawned_id text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS series_id text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS kr_id text NOT NULL DEFAULT '';
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS mentions jsonb NOT NULL DEFAULT '[]';
CREATE TABLE IF NOT EXISTS task_assignees (task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id text NOT NULL, PRIMARY KEY (task_id, user_id));
CREATE TABLE IF NOT EXISTS task_attachments (id text PRIMARY KEY, task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, name text NOT NULL,
  mime text NOT NULL DEFAULT '', size bigint NOT NULL DEFAULT 0, uploaded_by text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE INDEX IF NOT EXISTS tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS task_assignees_user ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS projects_ws ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS tasks_series ON tasks(series_id);
CREATE TABLE IF NOT EXISTS recurring_tasks (id text PRIMARY KEY, project_id text NOT NULL DEFAULT '${DEFAULT_PROJECT}', title text NOT NULL, description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium', tags jsonb NOT NULL DEFAULT '[]', subtasks jsonb NOT NULL DEFAULT '[]', assignees jsonb NOT NULL DEFAULT '[]', rule jsonb NOT NULL,
  created_by text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '', updated_at text NOT NULL DEFAULT '', seq bigserial);
`;
      async function migrate2() {
        await pool2.query(SCHEMA2);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await pool2.query(`INSERT INTO workspaces(id,name,description,open,created_at) VALUES($1,'C\xF4ng ty','Kh\xF4ng gian chung c\u1EE7a c\u1EA3 c\xF4ng ty',true,$2) ON CONFLICT DO NOTHING`, [DEFAULT_WS, now]);
        await pool2.query(`INSERT INTO departments(id,workspace_id,name) VALUES($1,$2,'Chung') ON CONFLICT DO NOTHING`, [DEFAULT_DEPT, DEFAULT_WS]);
        await pool2.query(
          `INSERT INTO projects(id,workspace_id,department_id,name,description,open,created_at) VALUES($1,$2,$3,'C\xF4ng vi\u1EC7c chung','C\xF4ng vi\u1EC7c h\u1EB1ng ng\xE0y v\xE0 vi\u1EC7c sinh ra t\u1EEB b\xE1o c\xE1o tu\u1EA7n',true,$4) ON CONFLICT DO NOTHING`,
          [DEFAULT_PROJECT, DEFAULT_WS, DEFAULT_DEPT, now]
        );
        await pool2.query(`INSERT INTO task_assignees(task_id,user_id) SELECT t.id, t.assignee_id FROM tasks t
      WHERE t.assignee_id <> '' AND NOT EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = t.id) ON CONFLICT DO NOTHING`);
        await pool2.query(`UPDATE tasks t SET kr_id = s.kr_id
      FROM (SELECT r.id AS rid, sol->>'id' AS sid, sol->>'krId' AS kr_id FROM reports r, jsonb_array_elements(r.solutions) sol
            WHERE COALESCE(sol->>'krId', '') <> '') s
      WHERE t.kr_id = '' AND t.report_id = s.rid AND t.solution_id = s.sid
        AND EXISTS (SELECT 1 FROM krs k WHERE k.id = s.kr_id)`);
        await pool2.query(`INSERT INTO recurring_tasks(id,project_id,title,description,priority,tags,subtasks,assignees,rule,created_by,created_at,updated_at)
      SELECT 'r_' || t.id, t.project_id, t.title, t.description, t.priority, t.tags,
        COALESCE((SELECT jsonb_agg(jsonb_set(s.value, '{done}', 'false'::jsonb) ORDER BY s.ord) FROM jsonb_array_elements(t.subtasks) WITH ORDINALITY AS s(value, ord)), '[]'::jsonb),
        COALESCE((SELECT jsonb_agg(a.user_id ORDER BY (a.user_id = t.assignee_id) DESC, a.user_id) FROM task_assignees a WHERE a.task_id = t.id), jsonb_build_array(t.assignee_id)),
        t.recurrence, COALESCE(NULLIF(t.created_by, ''), t.assignee_id), $1, $1
      FROM tasks t WHERE t.recurrence IS NOT NULL AND t.spawned_id = '' AND t.status <> 'done'
        AND NOT EXISTS (SELECT 1 FROM recurring_tasks r WHERE r.id = t.series_id OR r.id = 'r_' || t.id)
      ON CONFLICT DO NOTHING`, [now]);
        await pool2.query(`UPDATE tasks t SET series_id = 'r_' || t.id WHERE t.recurrence IS NOT NULL AND t.spawned_id = '' AND t.status <> 'done'
      AND t.series_id <> 'r_' || t.id AND EXISTS (SELECT 1 FROM recurring_tasks r WHERE r.id = 'r_' || t.id)`);
        try {
          fs2.mkdirSync(UPLOAD_DIR, { recursive: true });
        } catch (e) {
          console.error("Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c th\u01B0 m\u1EE5c t\u1EC7p \u0111\xEDnh k\xE8m " + UPLOAD_DIR + ": " + e.message);
        }
      }
      function projectAccess(c, p, members, deptHeadId) {
        const me = c.me;
        if (me.role === "director") return "admin";
        if (p.manager_id === me.id || deptHeadId && deptHeadId === me.id) return "pm";
        if (p.open || members.has(me.id)) return "member";
        for (const uid of members) if (canManage2(c, uid)) return "member";
        return null;
      }
      const seesAll = (access, p) => access === "admin" || access === "pm" || !!(p && p.share_all);
      function taskVisible(c, access, p, t, assignees) {
        if (!access) return false;
        if (seesAll(access, p)) return true;
        return t.created_by === c.me.id || assignees.includes(c.me.id) || assignees.some((a) => canManage2(c, a));
      }
      function canEditTask(c, access, t, assignees) {
        if (!access) return false;
        if (access === "admin" || access === "pm") return true;
        return t.created_by === c.me.id || assignees.includes(c.me.id) || assignees.some((a) => canManage2(c, a));
      }
      const canEditContent = (c, t) => !t.series_id && !!t.created_by && t.created_by === c.me.id;
      function canDeleteTask(c, access, t, assignees) {
        if (!access) return false;
        if (c.me.role === "director") return true;
        if (t.created_by) return t.created_by === c.me.id || canManage2(c, t.created_by);
        return assignees.some((a) => canManage2(c, a));
      }
      function canAssign(c, access, uid) {
        const u = c.byId[uid];
        return !!u && !!u.active;
      }
      const canManageRecurring = (c, r) => c.me.role === "director" || !!r.created_by && (r.created_by === c.me.id || canManage2(c, r.created_by));
      const recurringVisible = (c, r) => canManageRecurring(c, r) || idList(r.assignees).some((a) => a === c.me.id || canManage2(c, a));
      const assignError = (c, a) => {
        const u = c.byId[a];
        return !u ? "Ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n kh\xF4ng t\u1ED3n t\u1EA1i." : u.name + " \u0111\xE3 b\u1ECB kho\xE1 t\xE0i kho\u1EA3n.";
      };
      async function projectCtx(c, projectId) {
        const p = await one2(c.q, "SELECT * FROM projects WHERE id=$1", [projectId]);
        if (!p) return null;
        const members = new Set((await c.q.query("SELECT user_id FROM project_members WHERE project_id=$1", [projectId])).rows.map((r) => r.user_id));
        const dept = p.department_id ? await one2(c.q, "SELECT head_id FROM departments WHERE id=$1", [p.department_id]) : null;
        return { p, members, access: projectAccess(c, p, members, dept && dept.head_id) };
      }
      async function taskCtx(c, taskId) {
        const t = await one2(c.q, "SELECT * FROM tasks WHERE id=$1", [taskId]);
        if (!t) return null;
        const pc = await projectCtx(c, t.project_id);
        const assignees = await taskAssignees(c.q, t);
        return { t, assignees, p: pc ? pc.p : null, members: pc ? pc.members : /* @__PURE__ */ new Set(), access: pc ? pc.access : c.me.role === "director" ? "admin" : null };
      }
      async function taskAssignees(q, t) {
        const ids = (await q.query("SELECT user_id FROM task_assignees WHERE task_id=$1", [t.id])).rows.map((r) => r.user_id);
        if (t.assignee_id && !ids.includes(t.assignee_id)) ids.push(t.assignee_id);
        return [...ids.filter((x) => x === t.assignee_id), ...ids.filter((x) => x !== t.assignee_id).sort()];
      }
      async function ensureMember(q, projectId, wsId, userId) {
        await q.query("INSERT INTO project_members(project_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [projectId, userId]);
        await q.query("INSERT INTO workspace_members(workspace_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [wsId, userId]);
      }
      const jsonTask = (t, assignees, cc, ac) => ({
        id: t.id,
        projectId: t.project_id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assigneeIds: assignees,
        due: t.due,
        tags: t.tags || [],
        subtasks: t.subtasks || [],
        recurrence: t.recurrence || null,
        createdBy: t.created_by,
        createdAt: t.created_at,
        completedAt: t.completed_at,
        position: t.position,
        reportId: t.report_id || null,
        okrId: t.okr_id || null,
        krId: t.kr_id || "",
        seriesId: t.series_id || "",
        spawned: !!t.spawned_id,
        commentCount: cc || 0,
        attachCount: ac || 0
      });
      async function loadWork(viewer, wsId, users) {
        const c = ctxFor2(viewer, users);
        const [wsr, wmr, dpr, prr, pmr] = await Promise.all([
          pool2.query("SELECT * FROM workspaces ORDER BY seq"),
          pool2.query("SELECT * FROM workspace_members"),
          pool2.query("SELECT * FROM departments ORDER BY seq"),
          pool2.query("SELECT * FROM projects ORDER BY seq"),
          pool2.query("SELECT * FROM project_members")
        ]);
        const group = (rows, key) => {
          const m = /* @__PURE__ */ new Map();
          rows.forEach((r) => {
            if (!m.has(r[key])) m.set(r[key], /* @__PURE__ */ new Set());
            m.get(r[key]).add(r.user_id);
          });
          return m;
        };
        const wsMem = group(wmr.rows, "workspace_id"), prMem = group(pmr.rows, "project_id");
        const deptById = new Map(dpr.rows.map((d) => [d.id, d]));
        const isDir = c.me.role === "director";
        const access = /* @__PURE__ */ new Map();
        prr.rows.forEach((p) => {
          const a = projectAccess(c, p, prMem.get(p.id) || /* @__PURE__ */ new Set(), p.department_id && deptById.get(p.department_id) ? deptById.get(p.department_id).head_id : "");
          if (a) access.set(p.id, a);
        });
        const myWs = wsr.rows.filter((w) => isDir || w.open || w.created_by === c.me.id || (wsMem.get(w.id) || /* @__PURE__ */ new Set()).has(c.me.id) || prr.rows.some((p) => p.workspace_id === w.id && access.has(p.id)) || dpr.rows.some((d) => d.workspace_id === w.id && d.head_id === c.me.id));
        const current = myWs.find((w) => w.id === wsId) || myWs.find((w) => w.id === DEFAULT_WS) || myWs[0] || null;
        const projects = current ? prr.rows.filter((p) => p.workspace_id === current.id && access.has(p.id)) : [];
        const pids = projects.map((p) => p.id), pById = new Map(projects.map((p) => [p.id, p]));
        let tasks = [];
        if (pids.length) {
          const [tr, ar] = await Promise.all([
            pool2.query(`SELECT t.*, (SELECT count(*) FROM task_comments k WHERE k.task_id = t.id)::int AS cc, (SELECT count(*) FROM task_attachments a WHERE a.task_id = t.id)::int AS ac
                    FROM tasks t WHERE t.project_id = ANY($1) ORDER BY t.position, t.seq`, [pids]),
            pool2.query("SELECT a.task_id, a.user_id FROM task_assignees a JOIN tasks t ON t.id = a.task_id WHERE t.project_id = ANY($1)", [pids])
          ]);
          const asg = /* @__PURE__ */ new Map();
          ar.rows.forEach((r) => {
            if (!asg.has(r.task_id)) asg.set(r.task_id, []);
            asg.get(r.task_id).push(r.user_id);
          });
          tasks = tr.rows.map((t) => {
            const ids = asg.get(t.id) || [];
            if (t.assignee_id && !ids.includes(t.assignee_id)) ids.push(t.assignee_id);
            const ordered = [...ids.filter((x) => x === t.assignee_id), ...ids.filter((x) => x !== t.assignee_id).sort()];
            const p = pById.get(t.project_id);
            return taskVisible(c, access.get(t.project_id), p, t, ordered) ? jsonTask(t, ordered, t.cc, t.ac) : null;
          }).filter(Boolean);
        }
        return {
          workspaces: myWs.map((w) => ({
            id: w.id,
            name: w.name,
            description: w.description,
            color: w.color,
            open: w.open,
            archived: w.archived,
            memberIds: isDir ? [...wsMem.get(w.id) || []] : void 0
          })),
          currentId: current ? current.id : null,
          departments: current ? dpr.rows.filter((d) => d.workspace_id === current.id).map((d) => ({ id: d.id, name: d.name, headId: d.head_id })) : [],
          projects: projects.map((p) => ({
            id: p.id,
            workspaceId: p.workspace_id,
            departmentId: p.department_id,
            name: p.name,
            description: p.description,
            color: p.color,
            managerId: p.manager_id,
            open: p.open,
            shareAll: p.share_all,
            archived: p.archived,
            createdAt: p.created_at,
            access: access.get(p.id),
            memberIds: [...prMem.get(p.id) || []]
          })),
          recurring: await loadRecurring(c, pids),
          tasks,
          viewerId: c.me.id,
          loadedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      async function loadRecurring(c, pids) {
        if (!pids.length) return [];
        const rr = await pool2.query("SELECT * FROM recurring_tasks WHERE project_id = ANY($1) ORDER BY seq", [pids]);
        const rows = rr.rows.filter((r) => recurringVisible(c, r));
        if (!rows.length) return [];
        const st = await pool2.query(`SELECT series_id, count(*) FILTER (WHERE status <> 'done')::int AS open, min(due) FILTER (WHERE status <> 'done' AND due <> '') AS next
      FROM tasks WHERE series_id = ANY($1) GROUP BY series_id`, [rows.map((r) => r.id)]);
        const stat = new Map(st.rows.map((r) => [r.series_id, r]));
        return rows.map((r) => {
          const s = stat.get(r.id);
          return {
            id: r.id,
            projectId: r.project_id,
            title: r.title,
            description: r.description,
            priority: r.priority,
            tags: r.tags || [],
            subtasks: r.subtasks || [],
            assigneeIds: idList(r.assignees),
            rule: r.rule,
            createdBy: r.created_by,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            openCount: s ? s.open : 0,
            nextDue: s && s.next ? s.next : "",
            canEdit: canManageRecurring(c, r)
          };
        });
      }
      async function loadTaskDetail(c, taskId) {
        const tc = await taskCtx(c, taskId);
        if (!tc || !taskVisible(c, tc.access, tc.p, tc.t, tc.assignees)) throw new AppError2("Kh\xF4ng t\xECm th\u1EA5y c\xF4ng vi\u1EC7c ho\u1EB7c b\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n xem.");
        const [cm, at] = await Promise.all([
          pool2.query("SELECT * FROM task_comments WHERE task_id=$1 ORDER BY seq", [taskId]),
          pool2.query("SELECT * FROM task_attachments WHERE task_id=$1 ORDER BY seq", [taskId])
        ]);
        return {
          comments: cm.rows.map((r) => ({ id: r.id, authorId: r.author_id, text: r.text, createdAt: r.created_at, mentions: r.mentions || [] })),
          attachments: at.rows.map((a) => ({ id: a.id, name: a.name, mime: a.mime, size: Number(a.size), uploadedBy: a.uploaded_by, createdAt: a.created_at })),
          canEdit: canEditTask(c, tc.access, tc.t, tc.assignees),
          canDelete: canDeleteTask(c, tc.access, tc.t, tc.assignees),
          canEditContent: canEditContent(c, tc.t)
        };
      }
      const cleanTags = (v) => uniq((Array.isArray(v) ? v : []).map((x) => str2(x).trim().slice(0, 30)).filter(Boolean)).slice(0, 12);
      const cleanSubtasks = (v) => (Array.isArray(v) ? v : []).slice(0, 100).map((s) => ({ id: safeId(s && s.id) ? String(s.id) : newId("s"), text: str2(s && s.text).trim().slice(0, 300), done: !!(s && s.done) })).filter((s) => s.text);
      const normDue = (v) => {
        const s = str2(v).slice(0, 10);
        return validISO(s) ? s : "";
      };
      async function nextPosition(q, projectId, status) {
        const r = await one2(q, "SELECT COALESCE(MAX(position), 0) + 1000 AS p FROM tasks WHERE project_id=$1 AND status=$2", [projectId, status]);
        return Number(r.p);
      }
      async function renumberColumn(q, projectId, status, movingId, beforeId) {
        const ids = (await q.query("SELECT id FROM tasks WHERE project_id=$1 AND status=$2 AND id <> $3 ORDER BY position, seq", [projectId, status, movingId])).rows.map((r) => r.id);
        const at = beforeId ? ids.indexOf(beforeId) : -1;
        if (at >= 0) ids.splice(at, 0, movingId);
        else ids.push(movingId);
        await q.query("UPDATE tasks t SET position = v.ord * 1000 FROM unnest($1::text[]) WITH ORDINALITY AS v(id, ord) WHERE t.id = v.id", [ids]);
      }
      async function applyStatus(c, t, status) {
        if (t.status === status) return {};
        const done = status === "done";
        await c.q.query("UPDATE tasks SET status=$2, completed_at=$3 WHERE id=$1", [t.id, status, done ? (/* @__PURE__ */ new Date()).toISOString() : ""]);
        if (!done || !t.series_id || t.spawned_id) return {};
        const tpl = await one2(c.q, "SELECT * FROM recurring_tasks WHERE id=$1", [t.series_id]);
        if (!tpl) return {};
        const rule = cleanRule(tpl.rule);
        if (!rule) return {};
        const due = nextDue(rule, t.due, todayISO2());
        if (!due) return {};
        const id = await spawnInstance(c, tpl, rule, due);
        if (!id) return {};
        await c.q.query("UPDATE tasks SET spawned_id=$2 WHERE id=$1", [t.id, id]);
        return { spawned: { id, due, title: tpl.title } };
      }
      async function spawnInstance(c, tpl, rule, due) {
        const proj = await one2(c.q, "SELECT workspace_id, open, archived FROM projects WHERE id=$1", [tpl.project_id]);
        if (!proj || proj.archived) return null;
        let ids = idList(tpl.assignees).filter((id2) => c.byId[id2] && c.byId[id2].active);
        if (!ids.length) ids = [c.byId[tpl.created_by] && c.byId[tpl.created_by].active ? tpl.created_by : c.me.id];
        const id = newId("t");
        await c.q.query(
          `INSERT INTO tasks(id,title,assignee_id,okr_id,week,year,due,status,created_at,project_id,description,priority,tags,subtasks,recurrence,created_by,position,series_id)
      VALUES($1,$2,$3,NULL,0,0,$4,'todo',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            id,
            tpl.title,
            ids[0],
            due,
            (/* @__PURE__ */ new Date()).toISOString(),
            tpl.project_id,
            tpl.description,
            tpl.priority,
            JSON.stringify(tpl.tags || []),
            JSON.stringify((tpl.subtasks || []).map((s) => ({ ...s, done: false }))),
            JSON.stringify(rule),
            tpl.created_by || ids[0],
            await nextPosition(c.q, tpl.project_id, "todo"),
            tpl.id
          ]
        );
        for (const a of ids) {
          await c.q.query("INSERT INTO task_assignees(task_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [id, a]);
          if (!proj.open) await ensureMember(c.q, tpl.project_id, proj.workspace_id, a);
        }
        return id;
      }
      async function writeAssignees(c, taskId, ids, pc) {
        await c.q.query("UPDATE tasks SET assignee_id=$2 WHERE id=$1", [taskId, ids[0]]);
        await c.q.query("DELETE FROM task_assignees WHERE task_id=$1 AND NOT (user_id = ANY($2))", [taskId, ids]);
        for (const a of ids) {
          await c.q.query("INSERT INTO task_assignees(task_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [taskId, a]);
          if (!pc.members.has(a) && !pc.p.open) await ensureMember(c.q, pc.p.id, pc.p.workspace_id, a);
        }
      }
      const taskDir = (taskId) => path.join(UPLOAD_DIR, taskId);
      function removeTaskFiles(taskIds) {
        for (const id of taskIds || []) {
          if (!safeId(id)) continue;
          try {
            fs2.rmSync(taskDir(id), { recursive: true, force: true });
          } catch (e) {
            console.error("Kh\xF4ng xo\xE1 \u0111\u01B0\u1EE3c t\u1EC7p c\u1EE7a vi\u1EC7c " + id + ": " + e.message);
          }
        }
      }
      const cleanFileName = (s) => {
        const n = path.basename(str2(s).replace(/\\/g, "/")).replace(/[\u0000-\u001f<>:"|?*]/g, "_").trim().slice(0, 150);
        return n || "tep";
      };
      const extOf = (name) => (name.includes(".") ? name.split(".").pop() : "").toLowerCase();
      const actions = {
        /* ----- Workspace / Phòng ban: chỉ Giám đốc (Admin/Owner) ----- */
        async saveWorkspace(c, p) {
          if (c.me.role !== "director") deny2("Ch\u1EC9 Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c t\u1EA1o/s\u1EEDa Workspace.");
          const w = p.workspace || {};
          if (!safeId(w.id) || !str2(w.name).trim()) throw new AppError2("Nh\u1EADp t\xEAn Workspace.");
          const old = await one2(c.q, "SELECT * FROM workspaces WHERE id=$1", [w.id]);
          if (old && old.id === DEFAULT_WS && w.archived) throw new AppError2("Kh\xF4ng l\u01B0u tr\u1EEF \u0111\u01B0\u1EE3c Workspace m\u1EB7c \u0111\u1ECBnh.");
          const row = [w.id, str2(w.name).trim().slice(0, 80), str2(w.description).slice(0, 500), str2(w.color) || "#2f6fed", old && old.id === DEFAULT_WS ? true : !!w.open, !!w.archived];
          if (old) await c.q.query("UPDATE workspaces SET name=$2, description=$3, color=$4, open=$5, archived=$6 WHERE id=$1", row);
          else await c.q.query("INSERT INTO workspaces(id,name,description,color,open,archived,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [...row, c.me.id, (/* @__PURE__ */ new Date()).toISOString()]);
          if (Array.isArray(w.memberIds)) {
            const ids = idList(w.memberIds).filter((id) => c.byId[id]);
            await c.q.query("DELETE FROM workspace_members WHERE workspace_id=$1", [w.id]);
            for (const id of ids) await c.q.query("INSERT INTO workspace_members(workspace_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [w.id, id]);
          }
        },
        async deleteWorkspace(c, p) {
          if (c.me.role !== "director") deny2("Ch\u1EC9 Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c xo\xE1 Workspace.");
          if (p.id === DEFAULT_WS) throw new AppError2("Kh\xF4ng xo\xE1 \u0111\u01B0\u1EE3c Workspace m\u1EB7c \u0111\u1ECBnh.");
          if (await one2(c.q, "SELECT 1 FROM projects WHERE workspace_id=$1 LIMIT 1", [p.id])) throw new AppError2('Workspace c\xF2n d\u1EF1 \xE1n. H\xE3y xo\xE1 ho\u1EB7c l\u01B0u tr\u1EEF c\xE1c d\u1EF1 \xE1n tr\u01B0\u1EDBc, ho\u1EB7c d\xF9ng "L\u01B0u tr\u1EEF" Workspace.');
          await c.q.query("DELETE FROM workspaces WHERE id=$1", [p.id]);
        },
        async saveDepartment(c, p) {
          if (c.me.role !== "director") deny2("Ch\u1EC9 Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c t\u1EA1o/s\u1EEDa ph\xF2ng ban.");
          const d = p.department || {};
          if (!safeId(d.id) || !str2(d.name).trim() || !safeId(d.workspaceId)) throw new AppError2("Nh\u1EADp t\xEAn ph\xF2ng ban.");
          if (!await one2(c.q, "SELECT 1 FROM workspaces WHERE id=$1", [d.workspaceId])) throw new AppError2("Workspace kh\xF4ng t\u1ED3n t\u1EA1i.");
          const head = str2(d.headId);
          if (head && (!c.byId[head] || c.byId[head].role === "employee")) throw new AppError2("Tr\u01B0\u1EDFng ph\xF2ng ban ph\u1EA3i l\xE0 Gi\xE1m \u0111\u1ED1c, Tr\u01B0\u1EDFng ph\xF2ng ho\u1EB7c Qu\u1EA3n l\xFD.");
          const old = await one2(c.q, "SELECT workspace_id FROM departments WHERE id=$1", [d.id]);
          if (old && old.workspace_id !== d.workspaceId) throw new AppError2("Kh\xF4ng chuy\u1EC3n ph\xF2ng ban sang Workspace kh\xE1c \u0111\u01B0\u1EE3c.");
          if (old) await c.q.query("UPDATE departments SET name=$2, head_id=$3 WHERE id=$1", [d.id, str2(d.name).trim().slice(0, 80), head]);
          else await c.q.query("INSERT INTO departments(id,workspace_id,name,head_id) VALUES($1,$2,$3,$4)", [d.id, d.workspaceId, str2(d.name).trim().slice(0, 80), head]);
        },
        async deleteDepartment(c, p) {
          if (c.me.role !== "director") deny2("Ch\u1EC9 Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c xo\xE1 ph\xF2ng ban.");
          if (p.id === DEFAULT_DEPT) throw new AppError2("Kh\xF4ng xo\xE1 \u0111\u01B0\u1EE3c ph\xF2ng ban m\u1EB7c \u0111\u1ECBnh.");
          if (await one2(c.q, "SELECT 1 FROM projects WHERE department_id=$1 LIMIT 1", [p.id])) throw new AppError2("Ph\xF2ng ban c\xF2n d\u1EF1 \xE1n. H\xE3y chuy\u1EC3n ho\u1EB7c xo\xE1 c\xE1c d\u1EF1 \xE1n tr\u01B0\u1EDBc.");
          await c.q.query("DELETE FROM departments WHERE id=$1", [p.id]);
        },
        /* ----- Dự án: Giám đốc, hoặc Trưởng phòng/Quản lý với dự án do mình quản lý ----- */
        async saveProject(c, p) {
          const j = p.project || {};
          if (!safeId(j.id) || !str2(j.name).trim() || !safeId(j.workspaceId)) throw new AppError2("Nh\u1EADp t\xEAn d\u1EF1 \xE1n.");
          const isDir = c.me.role === "director";
          const old = await one2(c.q, "SELECT * FROM projects WHERE id=$1", [j.id]);
          if (old && old.workspace_id !== j.workspaceId) throw new AppError2("Kh\xF4ng chuy\u1EC3n d\u1EF1 \xE1n sang Workspace kh\xE1c \u0111\u01B0\u1EE3c.");
          const ws = await one2(c.q, "SELECT * FROM workspaces WHERE id=$1", [j.workspaceId]);
          if (!ws) throw new AppError2("Workspace kh\xF4ng t\u1ED3n t\u1EA1i.");
          let managerId;
          if (old) {
            if (!isDir && old.manager_id !== c.me.id) deny2("Ch\u1EC9 Gi\xE1m \u0111\u1ED1c ho\u1EB7c ng\u01B0\u1EDDi qu\u1EA3n l\xFD d\u1EF1 \xE1n \u0111\u01B0\u1EE3c s\u1EEDa d\u1EF1 \xE1n n\xE0y.");
            managerId = isDir ? str2(j.managerId) : old.manager_id;
          } else {
            if (c.me.role === "employee") deny2("Ch\u1EC9 Gi\xE1m \u0111\u1ED1c, Tr\u01B0\u1EDFng ph\xF2ng ho\u1EB7c Qu\u1EA3n l\xFD \u0111\u01B0\u1EE3c t\u1EA1o d\u1EF1 \xE1n.");
            if (!isDir) {
              const wm = await one2(c.q, "SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2", [ws.id, c.me.id]);
              const isHead = await one2(c.q, "SELECT 1 FROM departments WHERE workspace_id=$1 AND head_id=$2", [ws.id, c.me.id]);
              if (!ws.open && !wm && !isHead && ws.created_by !== c.me.id) deny2("B\u1EA1n ch\u01B0a thu\u1ED9c Workspace n\xE0y.");
            }
            managerId = isDir ? str2(j.managerId) || c.me.id : c.me.id;
          }
          if (managerId && (!c.byId[managerId] || c.byId[managerId].role === "employee" || !c.byId[managerId].active)) throw new AppError2("Ng\u01B0\u1EDDi qu\u1EA3n l\xFD d\u1EF1 \xE1n ph\u1EA3i l\xE0 Gi\xE1m \u0111\u1ED1c, Tr\u01B0\u1EDFng ph\xF2ng ho\u1EB7c Qu\u1EA3n l\xFD \u0111ang ho\u1EA1t \u0111\u1ED9ng.");
          const dept = str2(j.departmentId);
          if (dept && !await one2(c.q, "SELECT 1 FROM departments WHERE id=$1 AND workspace_id=$2", [dept, ws.id])) throw new AppError2("Ph\xF2ng ban kh\xF4ng thu\u1ED9c Workspace n\xE0y.");
          if (old && old.id === DEFAULT_PROJECT && j.archived) throw new AppError2("Kh\xF4ng l\u01B0u tr\u1EEF \u0111\u01B0\u1EE3c d\u1EF1 \xE1n m\u1EB7c \u0111\u1ECBnh.");
          const open = old && old.id === DEFAULT_PROJECT ? true : !!j.open;
          const row = [j.id, ws.id, dept, str2(j.name).trim().slice(0, 100), str2(j.description).slice(0, 1e3), str2(j.color) || "#2f6fed", managerId, open, !!j.shareAll, !!j.archived];
          if (old) await c.q.query("UPDATE projects SET workspace_id=$2, department_id=$3, name=$4, description=$5, color=$6, manager_id=$7, open=$8, share_all=$9, archived=$10 WHERE id=$1", row);
          else await c.q.query(
            "INSERT INTO projects(id,workspace_id,department_id,name,description,color,manager_id,open,share_all,archived,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
            [...row, c.me.id, (/* @__PURE__ */ new Date()).toISOString()]
          );
          if (Array.isArray(j.memberIds) || !old) {
            const keep = (await c.q.query(`SELECT DISTINCT a.user_id FROM task_assignees a JOIN tasks t ON t.id = a.task_id WHERE t.project_id=$1 AND t.status <> 'done'`, [j.id])).rows.map((r) => r.user_id);
            const ids = uniq([...idList(j.memberIds), managerId, c.me.id, ...keep].filter((id) => id && c.byId[id]));
            await c.q.query("DELETE FROM project_members WHERE project_id=$1", [j.id]);
            for (const id of ids) await ensureMember(c.q, j.id, ws.id, id);
          }
        },
        async deleteProject(c, p) {
          const pc = await projectCtx(c, p.id);
          if (!pc) return;
          if (pc.access !== "admin" && pc.p.manager_id !== c.me.id) deny2("Ch\u1EC9 Gi\xE1m \u0111\u1ED1c ho\u1EB7c ng\u01B0\u1EDDi qu\u1EA3n l\xFD d\u1EF1 \xE1n \u0111\u01B0\u1EE3c xo\xE1 d\u1EF1 \xE1n.");
          if (p.id === DEFAULT_PROJECT) throw new AppError2("Kh\xF4ng xo\xE1 \u0111\u01B0\u1EE3c d\u1EF1 \xE1n m\u1EB7c \u0111\u1ECBnh.");
          if (await one2(c.q, "SELECT 1 FROM recurring_tasks WHERE project_id=$1 LIMIT 1", [p.id])) throw new AppError2('D\u1EF1 \xE1n c\xF2n vi\u1EC7c l\u1EB7p l\u1EA1i. H\xE3y xo\xE1 ch\xFAng \u1EDF m\u1EE5c "Vi\u1EC7c l\u1EB7p l\u1EA1i" ho\u1EB7c d\xF9ng L\u01B0u tr\u1EEF.');
          const n = await one2(c.q, "SELECT count(*)::int AS n FROM tasks WHERE project_id=$1", [p.id]);
          if (n.n) throw new AppError2("D\u1EF1 \xE1n c\xF2n " + n.n + ' c\xF4ng vi\u1EC7c n\xEAn kh\xF4ng xo\xE1 \u0111\u01B0\u1EE3c. H\xE3y chuy\u1EC3n d\u1EF1 \xE1n sang "L\u01B0u tr\u1EEF" \u0111\u1EC3 gi\u1EEF l\u1EA1i l\u1ECBch s\u1EED.');
          await c.q.query("DELETE FROM projects WHERE id=$1", [p.id]);
        },
        /* ----- Công việc ----- */
        /**
         * Tạo công việc mới, hoặc (chỉ NGƯỜI TẠO) sửa nội dung việc mình đã tạo: tên, mô tả, ưu tiên, hạn, nhãn, việc con, người thực hiện.
         * Việc đã tạo hiện trên bảng bị khoá nội dung; việc lặp lại không tạo ở đây mà ở mục "Việc lặp lại" (saveRecurring).
         */
        async saveTask(c, p) {
          const t = p.task || {};
          if (!safeId(t.id)) throw new AppError2("Thi\u1EBFu m\xE3 c\xF4ng vi\u1EC7c.");
          const title = str2(t.title).trim().slice(0, 300);
          if (!title) throw new AppError2("Nh\u1EADp t\xEAn c\xF4ng vi\u1EC7c.");
          const old = await taskCtx(c, t.id);
          if (old && !canEditContent(c, old.t)) deny2(old.t.series_id ? 'Vi\u1EC7c sinh t\u1EEB l\u1ECBch l\u1EB7p l\u1EA1i: mu\u1ED1n \u0111\u1ED5i t\xEAn/m\xF4 t\u1EA3 h\xE3y s\u1EEDa \u1EDF m\u1EE5c "Vi\u1EC7c l\u1EB7p l\u1EA1i".' : 'Ch\u1EC9 ng\u01B0\u1EDDi t\u1EA1o c\xF4ng vi\u1EC7c m\u1EDBi s\u1EEDa \u0111\u01B0\u1EE3c t\xEAn, m\xF4 t\u1EA3 v\xE0 n\u1ED9i dung (\u1EDF m\u1EE5c "Vi\u1EC7c t\xF4i t\u1EA1o"). B\u1EA1n v\u1EABn giao l\u1EA1i vi\u1EC7c n\xE0y cho ng\u01B0\u1EDDi kh\xE1c \u0111\u01B0\u1EE3c.');
          const projectId = old ? old.t.project_id : safeId(t.projectId) ? t.projectId : DEFAULT_PROJECT;
          const pc = old ? { p: old.p, members: old.members, access: old.access } : await projectCtx(c, projectId);
          if (!pc || !pc.p) throw new AppError2("D\u1EF1 \xE1n kh\xF4ng t\u1ED3n t\u1EA1i.");
          if (!pc.access) deny2("B\u1EA1n ch\u01B0a tham gia d\u1EF1 \xE1n n\xE0y.");
          if (!old && pc.p.archived) throw new AppError2("D\u1EF1 \xE1n \u0111\xE3 l\u01B0u tr\u1EEF, kh\xF4ng th\xEAm vi\u1EC7c m\u1EDBi \u0111\u01B0\u1EE3c.");
          const priority = PRIORITIES.includes(t.priority) ? t.priority : old ? old.t.priority : "medium";
          let assignees = idList(t.assigneeIds);
          if (!assignees.length) assignees = old ? old.assignees : [c.me.id];
          const prev = old ? old.assignees : [];
          for (const a of assignees) if (!prev.includes(a) && !canAssign(c, pc.access, a)) throw new AppError2(assignError(c, a));
          const due = normDue(t.due);
          const tags = cleanTags(t.tags), subtasks = cleanSubtasks(t.subtasks), desc = str2(t.description).slice(0, 2e4);
          if (old) {
            await c.q.query(
              "UPDATE tasks SET title=$2, description=$3, priority=$4, due=$5, tags=$6, subtasks=$7 WHERE id=$1",
              [t.id, title, desc, priority, due, JSON.stringify(tags), JSON.stringify(subtasks)]
            );
          } else {
            const status = STATUSES.includes(t.status) ? t.status : "todo";
            const okrId = t.okrId ? str2(t.okrId) : null;
            await c.q.query(
              `INSERT INTO tasks(id,title,assignee_id,okr_id,week,year,due,status,created_at,project_id,description,priority,tags,subtasks,recurrence,created_by,position,completed_at,series_id)
          VALUES($1,$2,$3,$4,0,0,$5,$6,$7,$8,$9,$10,$11,$12,NULL,$13,$14,$15,'')`,
              [
                t.id,
                title,
                assignees[0],
                okrId,
                due,
                status,
                (/* @__PURE__ */ new Date()).toISOString(),
                projectId,
                desc,
                priority,
                JSON.stringify(tags),
                JSON.stringify(subtasks),
                c.me.id,
                await nextPosition(c.q, projectId, status),
                status === "done" ? (/* @__PURE__ */ new Date()).toISOString() : ""
              ]
            );
          }
          await writeAssignees(c, t.id, assignees, pc);
          return {};
        },
        /** Giao lại công việc cho người khác: người đang thực hiện, người tạo hoặc cấp trên; không giới hạn theo cấp bậc. Ghi lại vào bình luận. */
        async reassignTask(c, p) {
          const tc = await taskCtx(c, p.id);
          if (!tc) throw new AppError2("Kh\xF4ng t\xECm th\u1EA5y c\xF4ng vi\u1EC7c.");
          if (!canEditTask(c, tc.access, tc.t, tc.assignees)) deny2("Ch\u1EC9 ng\u01B0\u1EDDi t\u1EA1o, ng\u01B0\u1EDDi \u0111ang th\u1EF1c hi\u1EC7n ho\u1EB7c c\u1EA5p tr\xEAn m\u1EDBi giao l\u1EA1i \u0111\u01B0\u1EE3c c\xF4ng vi\u1EC7c n\xE0y.");
          if (tc.p && tc.p.archived) throw new AppError2("D\u1EF1 \xE1n \u0111\xE3 l\u01B0u tr\u1EEF, kh\xF4ng giao l\u1EA1i \u0111\u01B0\u1EE3c.");
          const ids = idList(p.assigneeIds);
          if (!ids.length) throw new AppError2("C\u1EA7n \xEDt nh\u1EA5t 1 ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n.");
          for (const a of ids) if (!tc.assignees.includes(a) && !canAssign(c, tc.access, a)) throw new AppError2(assignError(c, a));
          if (ids.length === tc.assignees.length && ids.every((a) => tc.assignees.includes(a)) && ids[0] === tc.assignees[0]) return {};
          await writeAssignees(c, tc.t.id, ids, { p: tc.p, members: tc.members });
          const name = (id) => (c.byId[id] || { name: "?" }).name;
          const added = ids.filter((a) => !tc.assignees.includes(a));
          await c.q.query(
            "INSERT INTO task_comments(id,task_id,author_id,text,created_at,mentions) VALUES($1,$2,$3,$4,$5,$6)",
            [
              newId("c"),
              tc.t.id,
              c.me.id,
              "\u0110\xE3 giao l\u1EA1i c\xF4ng vi\u1EC7c: " + tc.assignees.map(name).join(", ") + " \u2192 " + ids.map(name).join(", "),
              (/* @__PURE__ */ new Date()).toISOString(),
              JSON.stringify(added.filter((a) => a !== c.me.id))
            ]
          );
          return {};
        },
        /** Tick / bỏ tick một việc con (tiến độ) — chỉ đổi trạng thái xong, không đổi nội dung việc con. */
        async toggleSubtask(c, p) {
          const tc = await taskCtx(c, p.id);
          if (!tc) throw new AppError2("Kh\xF4ng t\xECm th\u1EA5y c\xF4ng vi\u1EC7c.");
          if (!canEditTask(c, tc.access, tc.t, tc.assignees)) deny2("B\u1EA1n kh\xF4ng c\u1EADp nh\u1EADt \u0111\u01B0\u1EE3c ti\u1EBFn \u0111\u1ED9 c\xF4ng vi\u1EC7c n\xE0y.");
          const subs = (tc.t.subtasks || []).map((s2) => ({ ...s2 }));
          const s = subs.find((x) => x.id === str2(p.subId));
          if (!s) throw new AppError2("Kh\xF4ng t\xECm th\u1EA5y vi\u1EC7c con.");
          s.done = !!p.done;
          await c.q.query("UPDATE tasks SET subtasks=$2 WHERE id=$1", [tc.t.id, JSON.stringify(subs)]);
          return {};
        },
        /** Kéo thả Kanban: đổi cột và/hoặc vị trí (đặt trước việc beforeId; không có = cuối cột). */
        async moveTask(c, p) {
          const tc = await taskCtx(c, p.id);
          if (!tc) throw new AppError2("Kh\xF4ng t\xECm th\u1EA5y c\xF4ng vi\u1EC7c.");
          if (!canEditTask(c, tc.access, tc.t, tc.assignees)) deny2("B\u1EA1n ch\u1EC9 chuy\u1EC3n \u0111\u01B0\u1EE3c tr\u1EA1ng th\xE1i vi\u1EC7c c\u1EE7a m\xECnh, c\u1EE7a c\u1EA5p d\u01B0\u1EDBi ho\u1EB7c trong d\u1EF1 \xE1n b\u1EA1n qu\u1EA3n l\xFD.");
          if (p.status !== void 0 && !STATUSES.includes(p.status)) throw new AppError2("Tr\u1EA1ng th\xE1i kh\xF4ng h\u1EE3p l\u1EC7.");
          const status = p.status !== void 0 ? p.status : tc.t.status;
          const result = await applyStatus(c, tc.t, status);
          await renumberColumn(c.q, tc.t.project_id, status, tc.t.id, safeId(p.beforeId) ? p.beforeId : "");
          return result;
        },
        /** Tương thích màn báo cáo tuần: { id, patch: { status } }. Tên/hạn của việc đã tạo không sửa được. */
        async updateTask(c, p) {
          const tc = await taskCtx(c, p.id);
          if (!tc) throw new AppError2("Kh\xF4ng t\xECm th\u1EA5y c\xF4ng vi\u1EC7c.");
          if (!canEditTask(c, tc.access, tc.t, tc.assignees)) deny2();
          const s = p.patch || {};
          if (s.title !== void 0 || s.due !== void 0) throw new AppError2("T\xEAn v\xE0 h\u1EA1n c\u1EE7a c\xF4ng vi\u1EC7c \u0111\xE3 t\u1EA1o kh\xF4ng s\u1EEDa \u0111\u01B0\u1EE3c \u1EDF \u0111\xE2y.");
          if (s.status !== void 0 && !STATUSES.includes(s.status)) throw new AppError2("Tr\u1EA1ng th\xE1i kh\xF4ng h\u1EE3p l\u1EC7.");
          if (s.status !== void 0) {
            const r = await applyStatus(c, tc.t, s.status);
            if (tc.t.status !== s.status) await c.q.query("UPDATE tasks SET position=$2 WHERE id=$1", [p.id, await nextPosition(c.q, tc.t.project_id, s.status)]);
            return r;
          }
          return {};
        },
        /** Tương thích bản giao diện cũ (form "Thêm công việc" đơn giản). */
        async addTask(c, p) {
          const t = p.task;
          if (!t || !t.id || !str2(t.title).trim()) throw new AppError2("Thi\u1EBFu d\u1EEF li\u1EC7u c\xF4ng vi\u1EC7c.");
          return actions.saveTask(c, { task: { id: t.id, title: t.title, due: t.due, okrId: t.okrId, projectId: DEFAULT_PROJECT, assigneeIds: [t.assigneeId || c.me.id], status: "todo" } });
        },
        async deleteTask(c, p) {
          const tc = await taskCtx(c, p.id);
          if (!tc) return;
          if (!canDeleteTask(c, tc.access, tc.t, tc.assignees)) deny2("B\u1EA1n kh\xF4ng \u0111\u01B0\u1EE3c xo\xE1 c\xF4ng vi\u1EC7c n\xE0y.");
          await c.q.query("DELETE FROM tasks WHERE id=$1", [p.id]);
          removeTaskFiles([p.id]);
        },
        /* ----- Việc lặp lại: MỘT nơi duy nhất để tạo/sửa lịch lặp (mẫu). Việc đã sinh ra giữ nguyên khi sửa mẫu. ----- */
        async saveRecurring(c, p) {
          const r = p.recurring || {};
          if (!safeId(r.id)) throw new AppError2("Thi\u1EBFu m\xE3 vi\u1EC7c l\u1EB7p l\u1EA1i.");
          const title = str2(r.title).trim().slice(0, 300);
          if (!title) throw new AppError2("Nh\u1EADp t\xEAn c\xF4ng vi\u1EC7c.");
          const rule = cleanRule(r.rule);
          if (!rule) throw new AppError2("Ch\u1ECDn l\u1ECBch l\u1EB7p l\u1EA1i h\u1EE3p l\u1EC7 (theo ng\xE0y, tu\u1EA7n ho\u1EB7c th\xE1ng).");
          const old = await one2(c.q, "SELECT * FROM recurring_tasks WHERE id=$1", [r.id]);
          if (old && !canManageRecurring(c, old)) deny2("Ch\u1EC9 ng\u01B0\u1EDDi t\u1EA1o, c\u1EA5p tr\xEAn c\u1EE7a ng\u01B0\u1EDDi t\u1EA1o ho\u1EB7c Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c s\u1EEDa vi\u1EC7c l\u1EB7p l\u1EA1i n\xE0y.");
          const projectId = old ? old.project_id : safeId(r.projectId) ? r.projectId : DEFAULT_PROJECT;
          const pc = await projectCtx(c, projectId);
          if (!pc || !pc.p) throw new AppError2("D\u1EF1 \xE1n kh\xF4ng t\u1ED3n t\u1EA1i.");
          if (!pc.access) deny2("B\u1EA1n ch\u01B0a tham gia d\u1EF1 \xE1n n\xE0y.");
          if (!old && pc.p.archived) throw new AppError2("D\u1EF1 \xE1n \u0111\xE3 l\u01B0u tr\u1EEF, kh\xF4ng th\xEAm vi\u1EC7c m\u1EDBi \u0111\u01B0\u1EE3c.");
          let ids = idList(r.assigneeIds);
          if (!ids.length) ids = [c.me.id];
          const prev = old ? idList(old.assignees) : [];
          for (const a of ids) if (!prev.includes(a) && !canAssign(c, pc.access, a)) throw new AppError2(assignError(c, a));
          const priority = PRIORITIES.includes(r.priority) ? r.priority : "medium";
          const tags = cleanTags(r.tags), subtasks = cleanSubtasks(r.subtasks).map((s) => ({ ...s, done: false })), desc = str2(r.description).slice(0, 2e4);
          const open = old ? await one2(c.q, `SELECT 1 FROM tasks WHERE series_id=$1 AND status <> 'done' LIMIT 1`, [r.id]) : null;
          let due = "";
          if (!old) {
            due = normDue(r.firstDue) || todayISO2();
            if (rule.end && due > rule.end) throw new AppError2("Ng\xE0y k\u1EBFt th\xFAc l\u1EB7p l\u1EA1i ph\u1EA3i sau h\u1EA1n ch\xF3t \u0111\u1EA7u ti\xEAn.");
          } else if (!open) {
            const today = todayISO2();
            due = nextDue(rule, isoOf(addDays(parseISO(today), -1)), today);
            if (!due) throw new AppError2("L\u1ECBch l\u1EB7p \u0111\xE3 qu\xE1 ng\xE0y k\u1EBFt th\xFAc. H\xE3y ch\u1ECDn ng\xE0y k\u1EBFt th\xFAc mu\u1ED9n h\u01A1n.");
          }
          const now = (/* @__PURE__ */ new Date()).toISOString();
          const row = [r.id, projectId, title, desc, priority, JSON.stringify(tags), JSON.stringify(subtasks), JSON.stringify(ids), JSON.stringify(rule)];
          if (old) await c.q.query("UPDATE recurring_tasks SET project_id=$2, title=$3, description=$4, priority=$5, tags=$6, subtasks=$7, assignees=$8, rule=$9, updated_at=$10 WHERE id=$1", [...row, now]);
          else await c.q.query("INSERT INTO recurring_tasks(id,project_id,title,description,priority,tags,subtasks,assignees,rule,created_by,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)", [...row, c.me.id, now]);
          const result = {};
          if (due) {
            const tpl = await one2(c.q, "SELECT * FROM recurring_tasks WHERE id=$1", [r.id]);
            const id = await spawnInstance(c, tpl, rule, due);
            if (id) result.spawned = { id, due, title };
          }
          return result;
        },
        async deleteRecurring(c, p) {
          const old = await one2(c.q, "SELECT * FROM recurring_tasks WHERE id=$1", [p.id]);
          if (!old) return;
          if (!canManageRecurring(c, old)) deny2("Ch\u1EC9 ng\u01B0\u1EDDi t\u1EA1o, c\u1EA5p tr\xEAn c\u1EE7a ng\u01B0\u1EDDi t\u1EA1o ho\u1EB7c Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c xo\xE1 vi\u1EC7c l\u1EB7p l\u1EA1i n\xE0y.");
          await c.q.query("DELETE FROM recurring_tasks WHERE id=$1", [p.id]);
        },
        /* ----- Bình luận (có @nhắc tên) ----- */
        async addTaskComment(c, p) {
          const cm = p.comment || {};
          if (!safeId(cm.id) || !safeId(cm.taskId) || !str2(cm.text).trim()) throw new AppError2("Thi\u1EBFu n\u1ED9i dung b\xECnh lu\u1EADn.");
          const tc = await taskCtx(c, cm.taskId);
          if (!tc) throw new AppError2("C\xF4ng vi\u1EC7c kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i.");
          if (!taskVisible(c, tc.access, tc.p, tc.t, tc.assignees)) deny2();
          const mentions = idList(cm.mentions).filter((id) => c.byId[id]).slice(0, 20);
          await c.q.query(
            "INSERT INTO task_comments(id,task_id,author_id,text,created_at,mentions) VALUES($1,$2,$3,$4,$5,$6)",
            [cm.id, cm.taskId, c.me.id, str2(cm.text).trim().slice(0, 4e3), (/* @__PURE__ */ new Date()).toISOString(), JSON.stringify(mentions)]
          );
        },
        async deleteTaskComment(c, p) {
          const row = await one2(c.q, "SELECT author_id, task_id FROM task_comments WHERE id=$1", [p.id]);
          if (!row) return;
          const tc = await taskCtx(c, row.task_id);
          if (!tc || !taskVisible(c, tc.access, tc.p, tc.t, tc.assignees)) deny2();
          if (row.author_id !== c.me.id && c.me.role !== "director") deny2("Ch\u1EC9 ng\u01B0\u1EDDi vi\u1EBFt ho\u1EB7c Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c xo\xE1 b\xECnh lu\u1EADn n\xE0y.");
          await c.q.query("DELETE FROM task_comments WHERE id=$1", [p.id]);
        },
        async deleteAttachment(c, p) {
          const a = await one2(c.q, "SELECT * FROM task_attachments WHERE id=$1", [p.id]);
          if (!a) return;
          const tc = await taskCtx(c, a.task_id);
          if (!tc || !taskVisible(c, tc.access, tc.p, tc.t, tc.assignees)) deny2();
          if (a.uploaded_by !== c.me.id && !canEditTask(c, tc.access, tc.t, tc.assignees)) deny2("B\u1EA1n kh\xF4ng \u0111\u01B0\u1EE3c xo\xE1 t\u1EC7p n\xE0y.");
          await c.q.query("DELETE FROM task_attachments WHERE id=$1", [p.id]);
          try {
            fs2.rmSync(path.join(taskDir(a.task_id), a.id), { force: true });
          } catch (e) {
          }
        }
      };
      async function upload(c, req, params) {
        const taskId = str2(params.taskId);
        if (!safeId(taskId)) throw new AppError2("Thi\u1EBFu m\xE3 c\xF4ng vi\u1EC7c.");
        const name = cleanFileName(params.name), ext = extOf(name);
        if (!MIME[ext]) throw new AppError2("Lo\u1EA1i t\u1EC7p ." + (ext || "?") + " ch\u01B0a \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3. H\u1ED7 tr\u1EE3: \u1EA3nh, PDF, Word, Excel, PowerPoint, v\u0103n b\u1EA3n, CSV, ZIP.");
        const declared = Number(req.headers["content-length"] || 0);
        if (declared > MAX_FILE) throw new AppError2("T\u1EC7p qu\xE1 l\u1EDBn (t\u1ED1i \u0111a " + Math.round(MAX_FILE / 1048576) + "MB).");
        const tc = await taskCtx(c, taskId);
        if (!tc) throw new AppError2("C\xF4ng vi\u1EC7c kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i.");
        if (!taskVisible(c, tc.access, tc.p, tc.t, tc.assignees)) deny2();
        if (tc.p && tc.p.archived) throw new AppError2("D\u1EF1 \xE1n \u0111\xE3 l\u01B0u tr\u1EEF.");
        const cnt = await one2(c.q, "SELECT count(*)::int AS n FROM task_attachments WHERE task_id=$1", [taskId]);
        if (cnt.n >= MAX_FILES_PER_TASK) throw new AppError2("M\u1ED7i c\xF4ng vi\u1EC7c t\u1ED1i \u0111a " + MAX_FILES_PER_TASK + " t\u1EC7p.");
        const id = newId("f"), dir = taskDir(taskId), file = path.join(dir, id);
        try {
          fs2.mkdirSync(dir, { recursive: true });
        } catch (e) {
          console.error(e);
          throw new AppError2("M\xE1y ch\u1EE7 ch\u01B0a c\u1EA5u h\xECnh \u0111\u01B0\u1EE3c n\u01A1i l\u01B0u t\u1EC7p.");
        }
        let size = 0;
        const counter = new Transform({ transform(chunk, _enc, cb) {
          size += chunk.length;
          if (size > MAX_FILE) cb(new AppError2("T\u1EC7p qu\xE1 l\u1EDBn (t\u1ED1i \u0111a " + Math.round(MAX_FILE / 1048576) + "MB)."));
          else cb(null, chunk);
        } });
        try {
          await pipeline(req, counter, fs2.createWriteStream(file, { flags: "wx", mode: 416 }));
          if (!size) throw new AppError2("T\u1EC7p r\u1ED7ng.");
          const now = (/* @__PURE__ */ new Date()).toISOString();
          await c.q.query("INSERT INTO task_attachments(id,task_id,name,mime,size,uploaded_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)", [id, taskId, name, MIME[ext], size, c.me.id, now]);
          return { id, name, mime: MIME[ext], size, uploadedBy: c.me.id, createdAt: now };
        } catch (e) {
          try {
            fs2.rmSync(file, { force: true });
          } catch (_) {
          }
          throw e;
        }
      }
      async function download(c, res, attId) {
        if (!safeId(attId)) throw new AppError2("T\u1EC7p kh\xF4ng h\u1EE3p l\u1EC7.");
        const a = await one2(c.q, "SELECT * FROM task_attachments WHERE id=$1", [attId]);
        if (!a) throw new AppError2("Kh\xF4ng t\xECm th\u1EA5y t\u1EC7p.");
        const tc = await taskCtx(c, a.task_id);
        if (!tc || !taskVisible(c, tc.access, tc.p, tc.t, tc.assignees)) deny2("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n xem t\u1EC7p n\xE0y.");
        const file = path.join(taskDir(a.task_id), a.id);
        let st;
        try {
          st = fs2.statSync(file);
        } catch (e) {
          throw new AppError2("T\u1EC7p kh\xF4ng c\xF2n tr\xEAn m\xE1y ch\u1EE7.");
        }
        const inline = INLINE_EXT.has(extOf(a.name));
        res.writeHead(200, {
          "Content-Type": a.mime || "application/octet-stream",
          "Content-Length": st.size,
          "X-Content-Type-Options": "nosniff",
          "Content-Disposition": (inline ? "inline" : "attachment") + "; filename*=UTF-8''" + encodeURIComponent(a.name),
          "Cache-Control": "private, max-age=300",
          "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox"
        });
        fs2.createReadStream(file).pipe(res);
      }
      return { SCHEMA: SCHEMA2, migrate: migrate2, actions, loadWork, loadTaskDetail, upload, download, removeTaskFiles, STATUSES, DEFAULT_PROJECT };
    };
    module2.exports.recurrence = { cleanRule, nextAfter, nextDue, validISO };
  }
});

// src/server.js
var http = require("http");
var crypto = require("crypto");
var fs = require("fs");
var zlib = require("zlib");
var { promisify } = require("util");
var scryptAsync = promisify(crypto.scrypt);
var gzipAsync = promisify(zlib.gzip);
var { Pool } = require_lib2();
var PORT = Number(process.env.PORT || 3100);
var TOKEN_SECRET = process.env.TOKEN_SECRET || "";
var TOKEN_DAYS = 30;
var ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim()).filter(Boolean);
var VERSION = 9;
var ROLES = ["director", "head", "manager", "employee"];
var PARENT_ROLE = { head: "director", manager: "head", employee: "manager" };
var ROLE_NAME = { director: "Gi\xE1m \u0111\u1ED1c", head: "Tr\u01B0\u1EDFng ph\xF2ng", manager: "Qu\u1EA3n l\xFD", employee: "Nh\xE2n vi\xEAn" };
var pool = new Pool({
  host: process.env.PGHOST || "db",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "okr",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "okr",
  max: 10
});
var SCHEMA = `
CREATE TABLE IF NOT EXISTS cycles (id text PRIMARY KEY, name text NOT NULL, start_date text NOT NULL, end_date text NOT NULL, active boolean NOT NULL DEFAULT false, seq bigserial);
CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, username text NOT NULL UNIQUE, pass_hash text NOT NULL DEFAULT '', name text NOT NULL, role text NOT NULL DEFAULT 'employee',
  dept text NOT NULL DEFAULT '', title text NOT NULL DEFAULT '', color text NOT NULL DEFAULT '#2f6fed', manager_id text NOT NULL DEFAULT '', seq bigserial);
CREATE TABLE IF NOT EXISTS okrs (id text PRIMARY KEY, owner_id text NOT NULL, title text NOT NULL, cycle_id text NOT NULL, status text NOT NULL DEFAULT 'pending',
  created_by text NOT NULL DEFAULT '', review_note text NOT NULL DEFAULT '', updated_at text NOT NULL DEFAULT '', seq bigserial);
CREATE TABLE IF NOT EXISTS krs (id text PRIMARY KEY, okr_id text NOT NULL REFERENCES okrs(id) ON DELETE CASCADE, title text NOT NULL, baseline double precision NOT NULL DEFAULT 0,
  current double precision NOT NULL DEFAULT 0, target double precision NOT NULL DEFAULT 0, unit text NOT NULL DEFAULT '', pos int NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS reports (id text PRIMARY KEY, user_id text NOT NULL, week int NOT NULL, year int NOT NULL, okr_id text NOT NULL, created_at text NOT NULL DEFAULT '',
  work text NOT NULL DEFAULT '', issues text NOT NULL DEFAULT '', causes text NOT NULL DEFAULT '', kr_updates jsonb NOT NULL DEFAULT '[]', solutions jsonb NOT NULL DEFAULT '[]', seq bigserial);
CREATE TABLE IF NOT EXISTS comments (id text PRIMARY KEY, report_id text NOT NULL REFERENCES reports(id) ON DELETE CASCADE, author_id text NOT NULL, text text NOT NULL,
  created_at text NOT NULL DEFAULT '', acknowledged boolean NOT NULL DEFAULT false, ack_at text, seq bigserial);
CREATE TABLE IF NOT EXISTS tasks (id text PRIMARY KEY, title text NOT NULL, assignee_id text NOT NULL, report_id text, solution_id text, okr_id text, week int NOT NULL DEFAULT 0,
  year int NOT NULL DEFAULT 0, due text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'todo', created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE TABLE IF NOT EXISTS task_comments (id text PRIMARY KEY, task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, author_id text NOT NULL, text text NOT NULL, created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE INDEX IF NOT EXISTS task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS krs_okr ON krs(okr_id);
CREATE INDEX IF NOT EXISTS comments_report ON comments(report_id);
CREATE INDEX IF NOT EXISTS tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS reports_user ON reports(user_id);
`;
async function migrate() {
  await pool.query(SCHEMA);
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true");
  await W.migrate();
}
var AppError = class extends Error {
  constructor(msg, auth) {
    super(msg);
    this.auth = !!auth;
  }
};
var deny = (msg) => {
  throw new AppError(msg || "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y.");
};
var authError = (msg) => new AppError(msg || "Phi\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 h\u1EBFt h\u1EA1n, vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i.", true);
var str = (v) => v === null || v === void 0 ? "" : String(v);
var num = (v) => Number(v) || 0;
var todayISO = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(pw), salt, 32);
  return "scrypt$" + salt.toString("base64") + "$" + h.toString("base64");
}
async function checkPassword(pw, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const h = await scryptAsync(String(pw), Buffer.from(parts[1], "base64"), 32);
  const want = Buffer.from(parts[2], "base64");
  return want.length === h.length && crypto.timingSafeEqual(h, want);
}
var sign = (data) => crypto.createHmac("sha256", TOKEN_SECRET).update(data).digest("base64url");
function makeToken(uid) {
  const data = uid + "." + (Date.now() + TOKEN_DAYS * 864e5);
  return data + "." + sign(data);
}
async function verifyToken(tok) {
  if (!tok) throw authError("Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i \u0111\u1EC3 ti\u1EBFp t\u1EE5c.");
  tok = String(tok);
  const i = tok.lastIndexOf(".");
  if (i < 0) throw authError();
  const data = tok.slice(0, i), sig = tok.slice(i + 1);
  const j = data.lastIndexOf(".");
  if (j < 0) throw authError();
  const uid = data.slice(0, j), exp = Number(data.slice(j + 1));
  const good = sign(data);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good)) || !(exp > Date.now())) throw authError();
  const u = (await getUsers()).find((x) => x.id === uid);
  if (!u) throw authError("T\xE0i kho\u1EA3n kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i.");
  if (!u.active) throw authError("T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\xE3 b\u1ECB kho\xE1. Li\xEAn h\u1EC7 Gi\xE1m \u0111\u1ED1c n\u1EBFu c\u1EA7n m\u1EDF l\u1EA1i.");
  return u;
}
var fails = /* @__PURE__ */ new Map();
var WINDOW = 15 * 6e4;
function failCount(key) {
  const a = (fails.get(key) || []).filter((t) => Date.now() - t < WINDOW);
  fails.set(key, a);
  return a.length;
}
function addFail(key) {
  const a = fails.get(key) || [];
  a.push(Date.now());
  fails.set(key, a);
}
setInterval(() => {
  for (const k of fails.keys()) if (!failCount(k)) fails.delete(k);
}, 6e4).unref();
function normalizeRoles(users) {
  users.forEach((u) => {
    u.role = String(u.role || "").trim().toLowerCase();
    if (!ROLES.includes(u.role)) u.role = "employee";
    u.managerId = u.managerId || "";
  });
  if (!users.some((u) => u.role === "director")) users.forEach((u) => {
    if ((u.role === "manager" || u.role === "head") && !u.managerId) u.role = "director";
  });
  return users;
}
async function getUsers(q = pool) {
  const r = await q.query("SELECT id, username, name, role, dept, title, color, manager_id, active FROM users ORDER BY seq");
  return normalizeRoles(r.rows.map((u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, dept: u.dept, title: u.title, color: u.color, managerId: u.manager_id, active: u.active !== false })));
}
async function ctx(viewer, q = pool) {
  const users = await getUsers(q), byId = {};
  users.forEach((u) => {
    byId[u.id] = u;
  });
  return { me: byId[viewer.id] || viewer, users, byId, q };
}
function ctxFor(viewer, users) {
  const byId = {};
  users.forEach((u) => {
    byId[u.id] = u;
  });
  return { me: byId[viewer.id] || viewer, users, byId, q: pool };
}
function canManage(c, targetId) {
  if (c.me.role === "director") return true;
  if (c.me.role !== "head" && c.me.role !== "manager") return false;
  let t = c.byId[targetId];
  const seen = {};
  if (!t || t.id === c.me.id) return false;
  while (t && t.managerId && !seen[t.id]) {
    if (t.managerId === c.me.id) return true;
    seen[t.id] = 1;
    t = c.byId[t.managerId];
  }
  return false;
}
var canSeeTaskOf = (c, assigneeId) => assigneeId === c.me.id || canManage(c, assigneeId);
var requireDirector = (c) => {
  if (c.me.role !== "director") deny("Ch\u1EC9 Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y.");
};
var dataVersion = String(Date.now());
var verSeq = 0;
var bumpVersion = () => {
  dataVersion = Date.now() + "." + ++verSeq;
};
var pubCache = { version: null, promise: null };
function publicPart() {
  if (pubCache.version !== dataVersion) {
    const v = dataVersion;
    pubCache = { version: v, promise: buildPublic().catch((e) => {
      if (pubCache.version === v) pubCache.version = null;
      throw e;
    }) };
  }
  return pubCache.promise;
}
async function buildPublic() {
  const db = await loadDB(null);
  return { users: db.users, json: JSON.stringify({ cycles: db.cycles, users: db.users, okrs: db.okrs, reports: db.reports }).slice(1, -1) };
}
async function viewerTasks(viewer, users) {
  const c = { me: users.find((u) => u.id === viewer.id) || viewer, byId: Object.fromEntries(users.map((u) => [u.id, u])) };
  const ids = users.filter((u) => canSeeTaskOf(c, u.id)).map((u) => u.id);
  return tasksWithComments(ids);
}
async function tasksWithComments(assigneeIds) {
  const tr = await pool.query(`SELECT * FROM tasks WHERE assignee_id = ANY($1) AND (report_id IS NOT NULL OR project_id = '${W.DEFAULT_PROJECT}') ORDER BY seq`, [assigneeIds]);
  const ids = tr.rows.map((t) => t.id), by = {};
  if (ids.length) {
    const cr = await pool.query("SELECT * FROM task_comments WHERE task_id = ANY($1) ORDER BY seq", [ids]);
    cr.rows.forEach((c) => {
      (by[c.task_id] = by[c.task_id] || []).push({ id: c.id, authorId: c.author_id, text: c.text, createdAt: c.created_at });
    });
  }
  return tr.rows.map((t) => ({
    id: t.id,
    title: t.title,
    assigneeId: t.assignee_id,
    reportId: t.report_id || null,
    solutionId: t.solution_id || null,
    okrId: t.okr_id || null,
    krId: t.kr_id || "",
    week: t.week,
    year: t.year,
    due: t.due,
    status: t.status,
    createdAt: t.created_at,
    comments: by[t.id] || []
  }));
}
async function dbResponse(viewer, extra) {
  const v = dataVersion, pub = await publicPart();
  const tasks = viewer ? await viewerTasks(viewer, pub.users) : [];
  const head = JSON.stringify({ ok: true, version: v, ...extra || {} }).slice(0, -1);
  return head + ',"db":{' + pub.json + ',"tasks":' + JSON.stringify(tasks) + ',"viewerId":' + JSON.stringify(viewer ? viewer.id : null) + ',"loadedAt":"' + (/* @__PURE__ */ new Date()).toISOString() + '"}}';
}
async function loadDB(viewer) {
  const [cy, users, ok, kr, rp, cm] = await Promise.all([
    pool.query("SELECT * FROM cycles ORDER BY seq"),
    getUsers(),
    pool.query("SELECT * FROM okrs ORDER BY seq"),
    pool.query("SELECT * FROM krs ORDER BY okr_id, pos"),
    pool.query("SELECT * FROM reports ORDER BY seq"),
    pool.query("SELECT * FROM comments ORDER BY seq")
  ]);
  let cycles = cy.rows.map((c) => ({ id: c.id, name: c.name, start: c.start_date, end: c.end_date, active: c.active }));
  if (!cycles.length) {
    const s = todayISO(), e = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
    await pool.query("INSERT INTO cycles(id,name,start_date,end_date,active) VALUES($1,$2,$3,$4,true) ON CONFLICT DO NOTHING", ["c1", "Chu k\u1EF3", s, e]);
    cycles = [{ id: "c1", name: "Chu k\u1EF3", start: s, end: e, active: true }];
  }
  if (!cycles.some((c) => c.active)) cycles[0].active = true;
  const activeId = cycles.find((c) => c.active).id;
  const krBy = {};
  kr.rows.forEach((k) => {
    (krBy[k.okr_id] = krBy[k.okr_id] || []).push({ id: k.id, title: k.title, baseline: k.baseline, current: k.current, target: k.target, unit: k.unit });
  });
  const okrs = ok.rows.map((o) => ({
    id: o.id,
    ownerId: o.owner_id,
    title: o.title,
    cycleId: o.cycle_id || activeId,
    status: o.status || "approved",
    createdBy: o.created_by || o.owner_id,
    reviewNote: o.review_note,
    updatedAt: o.updated_at,
    krs: krBy[o.id] || []
  }));
  const cmBy = {};
  cm.rows.forEach((c) => {
    (cmBy[c.report_id] = cmBy[c.report_id] || []).push({ id: c.id, authorId: c.author_id, text: c.text, createdAt: c.created_at, acknowledged: c.acknowledged, ackAt: c.ack_at || null });
  });
  const reports = rp.rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    week: r.week,
    year: r.year,
    okrId: r.okr_id,
    createdAt: r.created_at,
    work: r.work,
    issues: r.issues,
    causes: r.causes,
    krUpdates: r.kr_updates || [],
    solutions: r.solutions || [],
    comments: cmBy[r.id] || []
  }));
  let tasks = [];
  if (viewer) {
    const c = await ctx(viewer);
    const ids = c.users.filter((u) => canSeeTaskOf(c, u.id)).map((u) => u.id);
    tasks = await tasksWithComments(ids);
  }
  return { cycles, users, okrs, reports, tasks, viewerId: viewer ? viewer.id : null, loadedAt: (/* @__PURE__ */ new Date()).toISOString() };
}
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(4242)");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
    }
    throw e;
  } finally {
    client.release();
  }
}
var one = async (q, sql, args) => (await q.query(sql, args)).rows[0];
var W = require_work()({ pool, AppError, deny, str, num, one, canManage, todayISO, ctxFor });
async function login(p, ip) {
  const username = str(p.username).trim();
  const k1 = "u:" + ip + ":" + username.toLowerCase(), k2 = "ip:" + ip;
  if (failCount(k1) >= 8 || failCount(k2) >= 30) throw new AppError("\u0110\u0103ng nh\u1EADp sai qu\xE1 nhi\u1EC1u l\u1EA7n. Vui l\xF2ng th\u1EED l\u1EA1i sau 15 ph\xFAt.");
  const row = await one(pool, "SELECT id, pass_hash FROM users WHERE username = $1", [username]);
  if (!row || !await checkPassword(str(p.password), row.pass_hash)) {
    addFail(k1);
    addFail(k2);
    throw new AppError("Sai t\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u.");
  }
  fails.delete(k1);
  const u = (await getUsers()).find((u2) => u2.id === row.id);
  if (!u.active) throw new AppError("T\xE0i kho\u1EA3n n\xE0y \u0111\xE3 b\u1ECB kho\xE1. Li\xEAn h\u1EC7 Gi\xE1m \u0111\u1ED1c n\u1EBFu c\u1EA7n m\u1EDF l\u1EA1i.");
  return u;
}
var A = {
  async addReport(c, p) {
    const r = p.report, tasks = p.tasks || [];
    if (!r || !r.id || !r.okrId) throw new AppError("Thi\u1EBFu d\u1EEF li\u1EC7u b\xE1o c\xE1o.");
    const okr = await one(c.q, "SELECT id, owner_id FROM okrs WHERE id = $1", [r.okrId]);
    if (!okr || okr.owner_id !== c.me.id) deny("Ch\u1EC9 g\u1EEDi \u0111\u01B0\u1EE3c b\xE1o c\xE1o cho OKR c\u1EE7a ch\xEDnh b\u1EA1n.");
    const sent = /* @__PURE__ */ new Set();
    const prev = await c.q.query("SELECT kr_updates FROM reports WHERE user_id=$1 AND okr_id=$2 AND week=$3 AND year=$4", [c.me.id, r.okrId, num(r.week), num(r.year)]);
    for (const row of prev.rows) for (const ku of row.kr_updates || []) sent.add(ku.krId);
    if (!(r.krUpdates || []).length && prev.rows.length) throw new AppError("\u0110\xE3 c\xF3 b\xE1o c\xE1o tu\u1EA7n n\xE0y cho OKR n\xE0y.");
    if ((r.krUpdates || []).some((ku) => sent.has(ku.krId))) throw new AppError("C\xF3 KR \u0111\xE3 \u0111\u01B0\u1EE3c b\xE1o c\xE1o trong tu\u1EA7n n\xE0y r\u1ED3i.");
    await c.q.query(
      `INSERT INTO reports(id,user_id,week,year,okr_id,created_at,work,issues,causes,kr_updates,solutions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        r.id,
        c.me.id,
        num(r.week),
        num(r.year),
        r.okrId,
        str(r.createdAt) || (/* @__PURE__ */ new Date()).toISOString(),
        str(r.work),
        str(r.issues),
        str(r.causes),
        JSON.stringify(r.krUpdates || []),
        JSON.stringify(r.solutions || [])
      ]
    );
    for (const ku of r.krUpdates || []) await c.q.query("UPDATE krs SET current = $1 WHERE id = $2 AND okr_id = $3", [num(ku.value), ku.krId, okr.id]);
    const krOf = await solutionKrMap(c.q, okr.id, r.krUpdates);
    for (const t of tasks) await insertTask(c.q, { ...t, assigneeId: c.me.id, reportId: r.id, krId: krOf.get(t.solutionId) || "" });
  },
  async deleteReport(c, p) {
    const r = await one(c.q, "SELECT user_id FROM reports WHERE id=$1", [p.id]);
    if (!r) return;
    if (r.user_id !== c.me.id && c.me.role !== "director") deny("Ch\u1EC9 ng\u01B0\u1EDDi vi\u1EBFt b\xE1o c\xE1o ho\u1EB7c Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c xo\xE1 b\xE1o c\xE1o.");
    W.removeTaskFiles((await c.q.query("DELETE FROM tasks WHERE report_id=$1 RETURNING id", [p.id])).rows.map((x) => x.id));
    await c.q.query("DELETE FROM reports WHERE id=$1", [p.id]);
  },
  /* Sửa báo cáo tuần: chỉ người gửi, và chỉ khi chưa có cấp trên nào phản hồi/đánh giá. */
  async updateReport(c, p) {
    const r = p.report, tasks = p.tasks || [];
    if (!r || !r.id || !r.okrId) throw new AppError("Thi\u1EBFu d\u1EEF li\u1EC7u b\xE1o c\xE1o.");
    const old = await one(c.q, "SELECT * FROM reports WHERE id=$1", [r.id]);
    if (!old) throw new AppError("B\xE1o c\xE1o kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i.");
    if (old.user_id !== c.me.id) deny("Ch\u1EC9 ng\u01B0\u1EDDi g\u1EEDi b\xE1o c\xE1o \u0111\u01B0\u1EE3c s\u1EEDa b\xE1o c\xE1o n\xE0y.");
    if (old.okr_id !== r.okrId) throw new AppError("Kh\xF4ng \u0111\u1ED5i \u0111\u01B0\u1EE3c OKR c\u1EE7a b\xE1o c\xE1o \u0111\xE3 g\u1EEDi.");
    if (!(old.kr_updates || []).some((ku) => "work" in ku)) throw new AppError("B\xE1o c\xE1o c\u0169 (theo nguy\xEAn b\u1ED9 OKR) kh\xF4ng s\u1EEDa \u0111\u01B0\u1EE3c.");
    if (await one(c.q, "SELECT 1 FROM comments WHERE report_id=$1 AND author_id <> $2 LIMIT 1", [old.id, old.user_id]))
      throw new AppError("C\u1EA5p tr\xEAn \u0111\xE3 \u0111\xE1nh gi\xE1 b\xE1o c\xE1o n\xE0y n\xEAn kh\xF4ng s\u1EEDa \u0111\u01B0\u1EE3c n\u1EEFa.");
    const kus = r.krUpdates || [];
    if (!kus.length) throw new AppError("C\u1EA7n ch\u1ECDn \xEDt nh\u1EA5t 1 KR \u0111\u1EC3 b\xE1o c\xE1o.");
    const okrKrs = (await c.q.query("SELECT id FROM krs WHERE okr_id=$1", [old.okr_id])).rows.map((x) => x.id);
    if (kus.some((ku) => !okrKrs.includes(ku.krId)) || new Set(kus.map((ku) => ku.krId)).size !== kus.length) throw new AppError("KR kh\xF4ng h\u1EE3p l\u1EC7.");
    const others = await c.q.query("SELECT kr_updates FROM reports WHERE user_id=$1 AND okr_id=$2 AND week=$3 AND year=$4 AND id <> $5", [old.user_id, old.okr_id, old.week, old.year, old.id]);
    const sent = /* @__PURE__ */ new Set();
    others.rows.forEach((row) => (row.kr_updates || []).forEach((ku) => sent.add(ku.krId)));
    if (kus.some((ku) => sent.has(ku.krId))) throw new AppError("C\xF3 KR \u0111\xE3 \u0111\u01B0\u1EE3c b\xE1o c\xE1o \u1EDF m\u1ED9t b\xE1o c\xE1o kh\xE1c trong tu\u1EA7n n\xE0y.");
    const solutions = kus.flatMap((ku) => ku.solutions || []);
    await c.q.query(
      "UPDATE reports SET work=$2, issues=$3, causes=$4, kr_updates=$5, solutions=$6 WHERE id=$1",
      [old.id, str(r.work), str(r.issues), str(r.causes), JSON.stringify(kus), JSON.stringify(solutions)]
    );
    const newer = await c.q.query("SELECT kr_updates FROM reports WHERE okr_id=$1 AND seq > $2", [old.okr_id, old.seq]);
    const newerKr = /* @__PURE__ */ new Set();
    newer.rows.forEach((row) => (row.kr_updates || []).forEach((ku) => newerKr.add(ku.krId)));
    for (const ku of kus) if (!newerKr.has(ku.krId)) await c.q.query("UPDATE krs SET current=$1 WHERE id=$2 AND okr_id=$3", [num(ku.value), ku.krId, old.okr_id]);
    const ex = (await c.q.query("SELECT id, solution_id, status FROM tasks WHERE report_id=$1", [old.id])).rows;
    const keepSol = new Set(solutions.map((s) => s.id));
    for (const t of ex) if (t.solution_id && !keepSol.has(t.solution_id) && t.status === "todo") {
      await c.q.query("DELETE FROM tasks WHERE id=$1", [t.id]);
      W.removeTaskFiles([t.id]);
    }
    const krOf = await solutionKrMap(c.q, old.okr_id, kus);
    for (const s of solutions) {
      const cur = ex.find((t) => t.solution_id === s.id);
      if (cur) await c.q.query("UPDATE tasks SET title=$2, due=$3, kr_id=$4 WHERE id=$1", [cur.id, str(s.text), str(s.due), krOf.get(s.id) || ""]);
      else {
        const nt = tasks.find((t) => t.solutionId === s.id) || { id: "t" + crypto.randomBytes(6).toString("hex"), title: s.text, due: s.due, status: "todo", week: old.week, year: old.year, okrId: old.okr_id };
        await insertTask(c.q, { ...nt, title: str(s.text), due: str(s.due), assigneeId: old.user_id, reportId: old.id, solutionId: s.id, krId: krOf.get(s.id) || "" });
      }
    }
  },
  /* Bình luận / ghi chú trên công việc: ai xem được công việc thì được bình luận. */
  async addTaskComment(c, p) {
    const cm = p.comment;
    if (!cm || !cm.id || !cm.taskId || !str(cm.text).trim()) throw new AppError("Thi\u1EBFu n\u1ED9i dung ghi ch\xFA.");
    const t = await one(c.q, "SELECT assignee_id FROM tasks WHERE id=$1", [cm.taskId]);
    if (!t) throw new AppError("C\xF4ng vi\u1EC7c kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i.");
    if (!canSeeTaskOf(c, t.assignee_id)) deny();
    await c.q.query("INSERT INTO task_comments(id,task_id,author_id,text,created_at) VALUES($1,$2,$3,$4,$5)", [cm.id, cm.taskId, c.me.id, str(cm.text).trim().slice(0, 4e3), str(cm.createdAt) || (/* @__PURE__ */ new Date()).toISOString()]);
  },
  async deleteTaskComment(c, p) {
    const row = await one(c.q, "SELECT cm.author_id, t.assignee_id FROM task_comments cm JOIN tasks t ON t.id = cm.task_id WHERE cm.id=$1", [p.id]);
    if (!row) return;
    if (!canSeeTaskOf(c, row.assignee_id)) deny();
    if (row.author_id !== c.me.id && c.me.role !== "director") deny("Ch\u1EC9 ng\u01B0\u1EDDi vi\u1EBFt ho\u1EB7c Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c xo\xE1 ghi ch\xFA n\xE0y.");
    await c.q.query("DELETE FROM task_comments WHERE id=$1", [p.id]);
  },
  async addComment(c, p) {
    const cm = p.comment;
    if (!cm || !cm.id || !cm.reportId || !str(cm.text).trim()) throw new AppError("Thi\u1EBFu n\u1ED9i dung ph\u1EA3n h\u1ED3i.");
    const r = await one(c.q, "SELECT user_id FROM reports WHERE id=$1", [cm.reportId]);
    if (!r) throw new AppError("B\xE1o c\xE1o kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i.");
    if (r.user_id !== c.me.id && !canManage(c, r.user_id)) deny("Ch\u1EC9 c\u1EA5p tr\xEAn c\u1EE7a ng\u01B0\u1EDDi vi\u1EBFt ho\u1EB7c Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c ph\u1EA3n h\u1ED3i b\xE1o c\xE1o n\xE0y.");
    await c.q.query("INSERT INTO comments(id,report_id,author_id,text,created_at,acknowledged) VALUES($1,$2,$3,$4,$5,false)", [cm.id, cm.reportId, c.me.id, str(cm.text), str(cm.createdAt) || (/* @__PURE__ */ new Date()).toISOString()]);
  },
  async ackComment(c, p) {
    const row = await one(c.q, "SELECT r.user_id FROM comments cm JOIN reports r ON r.id = cm.report_id WHERE cm.id=$1", [p.id]);
    if (!row) throw new AppError("Kh\xF4ng t\xECm th\u1EA5y ph\u1EA3n h\u1ED3i.");
    if (row.user_id !== c.me.id) deny("Ch\u1EC9 ng\u01B0\u1EDDi vi\u1EBFt b\xE1o c\xE1o \u0111\u01B0\u1EE3c x\xE1c nh\u1EADn ch\u1EC9 \u0111\u1EA1o.");
    await c.q.query("UPDATE comments SET acknowledged=true, ack_at=$2 WHERE id=$1", [p.id, str(p.ackAt) || (/* @__PURE__ */ new Date()).toISOString()]);
  },
  async addTask(c, p) {
    const t = p.task;
    if (!t || !t.id || !str(t.title).trim()) throw new AppError("Thi\u1EBFu d\u1EEF li\u1EC7u c\xF4ng vi\u1EC7c.");
    t.assigneeId = t.assigneeId || c.me.id;
    if (!canSeeTaskOf(c, t.assigneeId)) deny("B\u1EA1n ch\u1EC9 giao \u0111\u01B0\u1EE3c vi\u1EC7c cho ch\xEDnh m\xECnh ho\u1EB7c c\u1EA5p d\u01B0\u1EDBi.");
    if (c.byId[t.assigneeId] && !c.byId[t.assigneeId].active) throw new AppError(c.byId[t.assigneeId].name + " \u0111\xE3 b\u1ECB kho\xE1 t\xE0i kho\u1EA3n, kh\xF4ng giao vi\u1EC7c m\u1EDBi \u0111\u01B0\u1EE3c.");
    await insertTask(c.q, t);
  },
  async updateTask(c, p) {
    const t = await one(c.q, "SELECT assignee_id FROM tasks WHERE id=$1", [p.id]);
    if (!t) throw new AppError("Kh\xF4ng t\xECm th\u1EA5y c\xF4ng vi\u1EC7c.");
    if (!canSeeTaskOf(c, t.assignee_id)) deny();
    const src = p.patch || {};
    if (src.status !== void 0 && !["todo", "doing", "done"].includes(src.status)) throw new AppError("Tr\u1EA1ng th\xE1i kh\xF4ng h\u1EE3p l\u1EC7.");
    await c.q.query(
      `UPDATE tasks SET status = COALESCE($2, status), title = COALESCE($3, title), due = COALESCE($4, due) WHERE id=$1`,
      [p.id, src.status ?? null, src.title !== void 0 ? str(src.title) : null, src.due !== void 0 ? str(src.due) : null]
    );
  },
  async deleteTask(c, p) {
    const t = await one(c.q, "SELECT assignee_id FROM tasks WHERE id=$1", [p.id]);
    if (!t) return;
    if (!canSeeTaskOf(c, t.assignee_id)) deny();
    await c.q.query("DELETE FROM tasks WHERE id=$1", [p.id]);
  },
  async saveOKR(c, p) {
    const o = p.okr;
    if (!o || !o.id || !str(o.title).trim() || !o.ownerId || !o.cycleId) throw new AppError("Thi\u1EBFu d\u1EEF li\u1EC7u OKR.");
    if (!o.krs || !o.krs.length) throw new AppError("OKR c\u1EA7n \xEDt nh\u1EA5t 1 KR.");
    if (!c.byId[o.ownerId]) throw new AppError("Ng\u01B0\u1EDDi ph\u1EE5 tr\xE1ch kh\xF4ng t\u1ED3n t\u1EA1i.");
    const old = await one(c.q, "SELECT * FROM okrs WHERE id=$1", [o.id]);
    const allowed = (ownerId) => ownerId === c.me.id || canManage(c, ownerId);
    if (!allowed(o.ownerId) || old && !allowed(old.owner_id)) deny("B\u1EA1n ch\u1EC9 t\u1EA1o/s\u1EEDa \u0111\u01B0\u1EE3c OKR c\u1EE7a ch\xEDnh m\xECnh ho\u1EB7c c\u1EA5p d\u01B0\u1EDBi.");
    if (!c.byId[o.ownerId].active && !(old && old.owner_id === o.ownerId)) throw new AppError(c.byId[o.ownerId].name + " \u0111\xE3 b\u1ECB kho\xE1 t\xE0i kho\u1EA3n, kh\xF4ng giao OKR m\u1EDBi \u0111\u01B0\u1EE3c.");
    const approved = canManage(c, o.ownerId);
    const row = [
      o.id,
      o.ownerId,
      str(o.title),
      o.cycleId,
      approved ? "approved" : "pending",
      old ? old.created_by || old.owner_id : c.me.id,
      approved && old ? old.review_note : "",
      str(o.updatedAt) || (/* @__PURE__ */ new Date()).toISOString()
    ];
    if (old) await c.q.query("UPDATE okrs SET owner_id=$2, title=$3, cycle_id=$4, status=$5, created_by=$6, review_note=$7, updated_at=$8 WHERE id=$1", row);
    else await c.q.query("INSERT INTO okrs(id,owner_id,title,cycle_id,status,created_by,review_note,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", row);
    const existing = (await c.q.query("SELECT id, current FROM krs WHERE okr_id=$1", [o.id])).rows;
    const keep = [];
    for (let i = 0; i < o.krs.length; i++) {
      const k = o.krs[i], ex = existing.find((x) => x.id === k.id);
      if (!k.id) throw new AppError("KR thi\u1EBFu m\xE3.");
      keep.push(k.id);
      const current = ex ? ex.current : k.current !== void 0 ? num(k.current) : num(k.baseline);
      await c.q.query(
        `INSERT INTO krs(id,okr_id,title,baseline,current,target,unit,pos) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, baseline=EXCLUDED.baseline, target=EXCLUDED.target, unit=EXCLUDED.unit, pos=EXCLUDED.pos WHERE krs.okr_id = EXCLUDED.okr_id`,
        [k.id, o.id, str(k.title), num(k.baseline), current, num(k.target), str(k.unit), i]
      );
    }
    await c.q.query("DELETE FROM krs WHERE okr_id=$1 AND NOT (id = ANY($2))", [o.id, keep]);
  },
  async reviewOKR(c, p) {
    if (!p.id || !["approved", "rejected"].includes(p.status)) throw new AppError("Thi\u1EBFu d\u1EEF li\u1EC7u duy\u1EC7t.");
    const o = await one(c.q, "SELECT owner_id FROM okrs WHERE id=$1", [p.id]);
    if (!o) throw new AppError("Kh\xF4ng t\xECm th\u1EA5y OKR.");
    if (!canManage(c, o.owner_id)) deny("Ch\u1EC9 c\u1EA5p tr\xEAn c\u1EE7a ng\u01B0\u1EDDi ph\u1EE5 tr\xE1ch ho\u1EB7c Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c duy\u1EC7t OKR n\xE0y.");
    await c.q.query("UPDATE okrs SET status=$2, review_note=$3, updated_at=$4 WHERE id=$1", [p.id, p.status, str(p.reviewNote), str(p.updatedAt) || (/* @__PURE__ */ new Date()).toISOString()]);
  },
  async deleteOKR(c, p) {
    const o = await one(c.q, "SELECT owner_id, status FROM okrs WHERE id=$1", [p.id]);
    if (!o) return;
    if (!canManage(c, o.owner_id) && !(o.owner_id === c.me.id && o.status !== "approved")) deny("B\u1EA1n kh\xF4ng \u0111\u01B0\u1EE3c xo\xE1 OKR n\xE0y.");
    if (await one(c.q, "SELECT 1 FROM reports WHERE okr_id=$1 LIMIT 1", [p.id])) throw new AppError("\u0110\xE3 c\xF3 b\xE1o c\xE1o tu\u1EA7n g\u1EAFn v\u1EDBi OKR n\xE0y, kh\xF4ng th\u1EC3 xo\xE1.");
    await c.q.query("DELETE FROM okrs WHERE id=$1", [p.id]);
    await c.q.query("UPDATE tasks SET okr_id=NULL WHERE okr_id=$1", [p.id]);
  },
  async saveCycle(c, p) {
    requireDirector(c);
    const y = p.cycle;
    if (!y || !y.id || !str(y.name).trim() || !y.start || !y.end) throw new AppError("Thi\u1EBFu d\u1EEF li\u1EC7u chu k\u1EF3.");
    await c.q.query(`INSERT INTO cycles(id,name,start_date,end_date,active) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date, active=EXCLUDED.active`, [y.id, str(y.name), y.start, y.end, !!y.active]);
    if (y.active) await c.q.query("UPDATE cycles SET active = (id = $1)", [y.id]);
    else if (!await one(c.q, "SELECT 1 FROM cycles WHERE active LIMIT 1")) await c.q.query("UPDATE cycles SET active=true WHERE id=$1", [y.id]);
  },
  async setActiveCycle(c, p) {
    requireDirector(c);
    await c.q.query("UPDATE cycles SET active = (id = $1)", [p.id]);
  },
  async deleteCycle(c, p) {
    requireDirector(c);
    if (await one(c.q, "SELECT 1 FROM okrs WHERE cycle_id=$1 LIMIT 1", [p.id])) throw new AppError("Chu k\u1EF3 \u0111ang c\xF3 OKR, kh\xF4ng th\u1EC3 xo\xE1.");
    const y = await one(c.q, "SELECT active FROM cycles WHERE id=$1", [p.id]);
    if (y && y.active) throw new AppError("Kh\xF4ng th\u1EC3 xo\xE1 chu k\u1EF3 \u0111ang ho\u1EA1t \u0111\u1ED9ng.");
    await c.q.query("DELETE FROM cycles WHERE id=$1", [p.id]);
  },
  async saveUser(c, p) {
    requireDirector(c);
    const u = p.user || {};
    const name = str(u.name).trim(), username = str(u.username).trim();
    if (!name || !username) throw new AppError("Nh\u1EADp \u0111\u1EE7 h\u1ECD t\xEAn v\xE0 t\xEAn \u0111\u0103ng nh\u1EADp.");
    const role = ROLES.includes(u.role) ? u.role : "employee";
    const old = u.id ? c.byId[u.id] : null;
    const id = old ? old.id : str(u.id) || "u" + crypto.randomBytes(4).toString("hex");
    if (c.users.some((x) => x.username === username && x.id !== id)) throw new AppError('T\xEAn \u0111\u0103ng nh\u1EADp "' + username + '" \u0111\xE3 \u0111\u01B0\u1EE3c d\xF9ng.');
    if (!old && !u.password) throw new AppError("T\xE0i kho\u1EA3n m\u1EDBi c\u1EA7n c\xF3 m\u1EADt kh\u1EA9u.");
    if (old && old.id === c.me.id && role !== "director") throw new AppError("Kh\xF4ng th\u1EC3 t\u1EF1 b\u1ECF vai tr\xF2 Gi\xE1m \u0111\u1ED1c c\u1EE7a ch\xEDnh m\xECnh.");
    const mgrId = role === "director" ? "" : str(u.managerId);
    if (mgrId) {
      const m = c.byId[mgrId];
      if (!m || m.id === id) throw new AppError("C\u1EA5p tr\xEAn tr\u1EF1c ti\u1EBFp kh\xF4ng h\u1EE3p l\u1EC7.");
      if (!m.active && !(old && old.managerId === mgrId)) throw new AppError(m.name + " \u0111\xE3 b\u1ECB kho\xE1, kh\xF4ng ch\u1ECDn l\xE0m c\u1EA5p tr\xEAn \u0111\u01B0\u1EE3c.");
      if (m.role !== PARENT_ROLE[role]) throw new AppError(ROLE_NAME[role] + " ph\u1EA3i tr\u1EF1c thu\u1ED9c m\u1ED9t " + ROLE_NAME[PARENT_ROLE[role]] + ".");
    }
    if (old && old.role !== role) {
      const wrong = c.users.filter((x) => x.managerId === old.id && PARENT_ROLE[x.role] !== role);
      if (wrong.length) throw new AppError("C\xF2n " + wrong.length + " ng\u01B0\u1EDDi tr\u1EF1c thu\u1ED9c kh\xF4ng h\u1EE3p v\u1EDBi vai tr\xF2 m\u1EDBi. H\xE3y chuy\u1EC3n h\u1ECD sang c\u1EA5p tr\xEAn kh\xE1c tr\u01B0\u1EDBc.");
    }
    const color = str(u.color) || old && old.color || "#2f6fed";
    if (old) {
      await c.q.query("UPDATE users SET username=$2, name=$3, role=$4, dept=$5, title=$6, color=$7, manager_id=$8 WHERE id=$1", [id, username, name, role, str(u.dept), str(u.title), color, mgrId]);
      if (u.password) await c.q.query("UPDATE users SET pass_hash=$2 WHERE id=$1", [id, hashPassword(u.password)]);
    } else {
      await c.q.query(
        "INSERT INTO users(id,username,pass_hash,name,role,dept,title,color,manager_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [id, username, hashPassword(u.password), name, role, str(u.dept), str(u.title), color, mgrId]
      );
    }
  },
  /* Khoá / mở khoá (chỉ Giám đốc). Người bị khoá không đăng nhập được, phiên đang mở bị đăng xuất; dữ liệu cũ giữ nguyên. */
  async setUserActive(c, p) {
    requireDirector(c);
    const u = c.byId[p.id];
    if (!u) throw new AppError("Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n.");
    const active = !!p.active;
    if (!active) {
      if (u.id === c.me.id) throw new AppError("Kh\xF4ng th\u1EC3 t\u1EF1 kho\xE1 t\xE0i kho\u1EA3n c\u1EE7a ch\xEDnh m\xECnh.");
      const subs = c.users.filter((x) => x.managerId === u.id && x.active);
      if (subs.length) throw new AppError(u.name + " c\xF2n " + subs.length + " ng\u01B0\u1EDDi tr\u1EF1c thu\u1ED9c (" + subs.slice(0, 3).map((x) => x.name).join(", ") + (subs.length > 3 ? "\u2026" : "") + "). H\xE3y chuy\u1EC3n h\u1ECD sang c\u1EA5p tr\xEAn kh\xE1c tr\u01B0\u1EDBc khi kho\xE1.");
    } else if (u.managerId && c.byId[u.managerId] && !c.byId[u.managerId].active) {
      throw new AppError("C\u1EA5p tr\xEAn tr\u1EF1c ti\u1EBFp c\u1EE7a " + u.name + " (" + c.byId[u.managerId].name + ") \u0111ang b\u1ECB kho\xE1. H\xE3y s\u1EEDa c\u1EA5p tr\xEAn tr\u01B0\u1EDBc khi m\u1EDF kho\xE1.");
    }
    await c.q.query("UPDATE users SET active=$2 WHERE id=$1", [u.id, active]);
  },
  /* Xoá hẳn (chỉ Giám đốc) — chỉ cho tài khoản chưa có dữ liệu nào, ví dụ tạo nhầm. Có dữ liệu thì dùng Khoá. */
  async deleteUser(c, p) {
    requireDirector(c);
    const u = c.byId[p.id];
    if (!u) return;
    if (u.id === c.me.id) throw new AppError("Kh\xF4ng th\u1EC3 t\u1EF1 xo\xE1 t\xE0i kho\u1EA3n c\u1EE7a ch\xEDnh m\xECnh.");
    if (c.users.some((x) => x.managerId === u.id)) throw new AppError(u.name + " c\xF2n ng\u01B0\u1EDDi tr\u1EF1c thu\u1ED9c, kh\xF4ng th\u1EC3 xo\xE1.");
    const used = await one(c.q, `SELECT (SELECT count(*) FROM okrs WHERE owner_id=$1 OR created_by=$1) + (SELECT count(*) FROM reports WHERE user_id=$1)
      + (SELECT count(*) FROM tasks WHERE assignee_id=$1 OR created_by=$1) + (SELECT count(*) FROM task_assignees WHERE user_id=$1)
      + (SELECT count(*) FROM task_comments WHERE author_id=$1) + (SELECT count(*) FROM comments WHERE author_id=$1) AS n`, [u.id]);
    if (Number(used.n)) throw new AppError(u.name + ' \u0111\xE3 c\xF3 OKR, b\xE1o c\xE1o, c\xF4ng vi\u1EC7c ho\u1EB7c ph\u1EA3n h\u1ED3i trong h\u1EC7 th\u1ED1ng n\xEAn kh\xF4ng xo\xE1 \u0111\u01B0\u1EE3c. H\xE3y d\xF9ng "Kho\xE1 t\xE0i kho\u1EA3n" \u0111\u1EC3 gi\u1EEF l\u1EA1i l\u1ECBch s\u1EED.');
    await c.q.query("DELETE FROM workspace_members WHERE user_id=$1", [u.id]);
    await c.q.query("DELETE FROM project_members WHERE user_id=$1", [u.id]);
    await c.q.query("DELETE FROM users WHERE id=$1", [u.id]);
  },
  /* Mỗi người tự đổi mật khẩu của mình (cần mật khẩu hiện tại). */
  async changePassword(c, p) {
    const pw = str(p.newPassword);
    if (pw.length < 6) throw new AppError("M\u1EADt kh\u1EA9u m\u1EDBi c\u1EA7n \xEDt nh\u1EA5t 6 k\xFD t\u1EF1.");
    const key = "pw:" + c.me.id;
    if (failCount(key) >= 8) throw new AppError("Nh\u1EADp sai m\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i qu\xE1 nhi\u1EC1u l\u1EA7n. Vui l\xF2ng th\u1EED l\u1EA1i sau 15 ph\xFAt.");
    const row = await one(c.q, "SELECT pass_hash FROM users WHERE id=$1", [c.me.id]);
    if (!row || !await checkPassword(str(p.oldPassword), row.pass_hash)) {
      addFail(key);
      throw new AppError("M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i kh\xF4ng \u0111\xFAng.");
    }
    if (await checkPassword(pw, row.pass_hash)) throw new AppError("M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i kh\xE1c m\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i.");
    fails.delete(key);
    await c.q.query("UPDATE users SET pass_hash=$2 WHERE id=$1", [c.me.id, hashPassword(pw)]);
  }
};
Object.assign(A, W.actions);
async function solutionKrMap(q, okrId, krUpdates) {
  const valid = new Set((await q.query("SELECT id FROM krs WHERE okr_id=$1", [okrId])).rows.map((x) => x.id));
  const m = /* @__PURE__ */ new Map();
  for (const ku of krUpdates || []) if (valid.has(ku.krId)) {
    for (const s of ku.solutions || []) if (s && s.id) m.set(s.id, ku.krId);
  }
  return m;
}
async function insertTask(q, t) {
  await q.query(
    `INSERT INTO tasks(id,title,assignee_id,report_id,solution_id,okr_id,week,year,due,status,created_at,project_id,created_by,kr_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      t.id,
      str(t.title),
      t.assigneeId,
      t.reportId || null,
      t.solutionId || null,
      t.okrId || null,
      num(t.week),
      num(t.year),
      str(t.due),
      W.STATUSES.includes(t.status) ? t.status : "todo",
      str(t.createdAt) || (/* @__PURE__ */ new Date()).toISOString(),
      t.projectId || W.DEFAULT_PROJECT,
      str(t.createdBy) || t.assigneeId,
      str(t.krId)
    ]
  );
  await q.query("INSERT INTO task_assignees(task_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [t.id, t.assigneeId]);
}
function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Okr-Token");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
}
async function send(res, obj, code = 200, req) {
  let body = Buffer.from(typeof obj === "string" ? obj : JSON.stringify(obj));
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (req && body.length > 2048 && /\bgzip\b/.test(String(req.headers["accept-encoding"] || ""))) {
    body = await gzipAsync(body, { level: 5 });
    headers["Content-Encoding"] = "gzip";
    headers["Vary"] = "Accept-Encoding, Origin";
  }
  res.writeHead(code, headers);
  res.end(body);
}
var errOut = (res, e) => {
  if (!(e instanceof AppError)) console.error((/* @__PURE__ */ new Date()).toISOString(), e);
  send(res, { ok: false, error: e instanceof AppError ? e.message : "L\u1ED7i m\xE1y ch\u1EE7, vui l\xF2ng th\u1EED l\u1EA1i.", auth: !!(e && e.auth) });
};
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (d) => {
      size += d.length;
      if (size > 1e6) {
        reject(new AppError("D\u1EEF li\u1EC7u g\u1EEDi l\xEAn qu\xE1 l\u1EDBn."));
        req.destroy();
      } else chunks.push(d);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
var clientIp = (req) => String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
async function handle(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  const url = new URL(req.url, "http://x");
  try {
    if (req.method === "GET") {
      if (url.pathname.endsWith("/health")) {
        await pool.query("SELECT 1");
        return send(res, { ok: true, version: VERSION });
      }
      if (url.searchParams.get("ping")) return send(res, { ok: true, ping: "pong", version: VERSION, backend: "postgres", time: (/* @__PURE__ */ new Date()).toISOString() });
      const tok = url.searchParams.get("token");
      const fileM = url.pathname.match(/\/file\/([A-Za-z0-9_-]+)$/);
      if (fileM) return await W.download(await ctx(await verifyToken(tok)), res, fileM[1]);
      const viewer2 = tok ? await verifyToken(tok) : null;
      if (url.searchParams.get("work")) {
        if (!viewer2) throw authError("Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i \u0111\u1EC3 ti\u1EBFp t\u1EE5c.");
        if (url.searchParams.get("v") && url.searchParams.get("v") === dataVersion) return send(res, { ok: true, unchanged: true, version: dataVersion });
        const v = dataVersion, users = (await publicPart()).users;
        return send(res, { ok: true, version: v, work: await W.loadWork(viewer2, str(url.searchParams.get("ws")), users) }, 200, req);
      }
      if (url.searchParams.get("workTask")) {
        if (!viewer2) throw authError("Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i \u0111\u1EC3 ti\u1EBFp t\u1EE5c.");
        return send(res, { ok: true, ...await W.loadTaskDetail(await ctx(viewer2), str(url.searchParams.get("workTask"))) }, 200, req);
      }
      if (url.searchParams.get("v") && url.searchParams.get("v") === dataVersion) return send(res, { ok: true, unchanged: true, version: dataVersion });
      return send(res, await dbResponse(viewer2), 200, req);
    }
    if (req.method !== "POST") return send(res, { ok: false, error: "Method not allowed" }, 405);
    if (url.pathname.endsWith("/upload")) {
      const viewer2 = await verifyToken(req.headers["x-okr-token"]);
      const file = await W.upload(await ctx(viewer2), req, { taskId: url.searchParams.get("taskId"), name: url.searchParams.get("name") });
      bumpVersion();
      return send(res, { ok: true, version: dataVersion, attachment: file });
    }
    let body;
    try {
      body = JSON.parse(await readBody(req) || "{}");
    } catch (e) {
      throw e instanceof AppError ? e : new AppError("D\u1EEF li\u1EC7u g\u1EEDi l\xEAn kh\xF4ng h\u1EE3p l\u1EC7.");
    }
    const action = body.action, p = body.payload || {};
    if (action === "ping") return send(res, { ok: true, ping: "pong", version: VERSION });
    if (action === "login") {
      const u = await login(p, clientIp(req));
      return send(res, await dbResponse(u, { user: u, token: makeToken(u.id) }), 200, req);
    }
    if (!Object.prototype.hasOwnProperty.call(A, action)) throw new AppError("H\xE0nh \u0111\u1ED9ng kh\xF4ng h\u1EE3p l\u1EC7: " + action);
    let viewer = await verifyToken(body.token);
    const result = await tx(async (client) => {
      const c = await ctx(viewer, client);
      return await A[action](c, p);
    });
    bumpVersion();
    if (body.lite) return send(res, { ok: true, version: dataVersion, result });
    viewer = (await getUsers()).find((u) => u.id === viewer.id) || viewer;
    return send(res, await dbResponse(viewer, { result }), 200, req);
  } catch (e) {
    errOut(res, e);
  }
}
async function importDB(db, opts = {}) {
  const existing = await one(pool, "SELECT count(*)::int AS n FROM users");
  if (existing.n && !opts.force) throw new Error("C\u01A1 s\u1EDF d\u1EEF li\u1EC7u \u0111\xE3 c\xF3 d\u1EEF li\u1EC7u (" + existing.n + " ng\u01B0\u1EDDi d\xF9ng). Th\xEAm --force \u0111\u1EC3 ghi \u0111\xE8.");
  const temp = [];
  await tx(async (q) => {
    if (opts.force) await q.query("TRUNCATE comments, krs, reports, okrs, tasks, cycles, users CASCADE");
    for (const c of db.cycles || []) await q.query("INSERT INTO cycles(id,name,start_date,end_date,active) VALUES($1,$2,$3,$4,$5)", [c.id, str(c.name), str(c.start), str(c.end), !!c.active]);
    for (const u of db.users || []) {
      let pw = u.password || (opts.passwords || {})[u.username];
      if (!pw) {
        pw = crypto.randomBytes(12).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 8);
        temp.push({ username: u.username, name: u.name, password: pw });
      }
      await q.query(
        "INSERT INTO users(id,username,pass_hash,name,role,dept,title,color,manager_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [u.id, str(u.username), hashPassword(pw), str(u.name), str(u.role) || "employee", str(u.dept), str(u.title), str(u.color) || "#2f6fed", str(u.managerId)]
      );
    }
    for (const o of db.okrs || []) {
      await q.query(
        "INSERT INTO okrs(id,owner_id,title,cycle_id,status,created_by,review_note,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [o.id, o.ownerId, str(o.title), str(o.cycleId), str(o.status) || "approved", str(o.createdBy), str(o.reviewNote), str(o.updatedAt)]
      );
      for (let i = 0; i < (o.krs || []).length; i++) {
        const k = o.krs[i];
        await q.query("INSERT INTO krs(id,okr_id,title,baseline,current,target,unit,pos) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [k.id, o.id, str(k.title), num(k.baseline), num(k.current), num(k.target), str(k.unit), i]);
      }
    }
    for (const r of db.reports || []) {
      await q.query(
        "INSERT INTO reports(id,user_id,week,year,okr_id,created_at,work,issues,causes,kr_updates,solutions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
        [r.id, r.userId, num(r.week), num(r.year), str(r.okrId), str(r.createdAt), str(r.work), str(r.issues), str(r.causes), JSON.stringify(r.krUpdates || []), JSON.stringify(r.solutions || [])]
      );
      for (const c of r.comments || []) await q.query(
        "INSERT INTO comments(id,report_id,author_id,text,created_at,acknowledged,ack_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [c.id, r.id, c.authorId, str(c.text), str(c.createdAt), !!c.acknowledged, c.ackAt || null]
      );
    }
    for (const t of db.tasks || []) await insertTask(q, t);
  });
  bumpVersion();
  return { users: (db.users || []).length, okrs: (db.okrs || []).length, reports: (db.reports || []).length, tasks: (db.tasks || []).length, temp };
}
async function importFromGas() {
  const url = process.env.GAS_URL, user = process.env.GAS_USER, pass = process.env.GAS_PASS;
  if (!url || !user || !pass) throw new Error("Thi\u1EBFu GAS_URL / GAS_USER / GAS_PASS");
  const res = await fetch(url, { method: "POST", body: JSON.stringify({ action: "login", payload: { username: user, password: pass } }), redirect: "follow" });
  const j = JSON.parse(await res.text());
  if (!j.ok) throw new Error("\u0110\u0103ng nh\u1EADp Apps Script th\u1EA5t b\u1EA1i: " + j.error);
  if (j.user.role !== "director") throw new Error("C\u1EA7n \u0111\u0103ng nh\u1EADp b\u1EB1ng t\xE0i kho\u1EA3n Gi\xE1m \u0111\u1ED1c \u0111\u1EC3 l\u1EA5y to\xE0n b\u1ED9 c\xF4ng vi\u1EC7c.");
  return importDB(j.db, { passwords: { [user]: pass }, force: process.argv.includes("--force") });
}
function printImport(r) {
  console.log(`\u0110\xE3 nh\u1EADp: ${r.users} ng\u01B0\u1EDDi d\xF9ng, ${r.okrs} OKR, ${r.reports} b\xE1o c\xE1o, ${r.tasks} c\xF4ng vi\u1EC7c.`);
  if (r.temp.length) {
    console.log("\nM\u1EACT KH\u1EA8U T\u1EA0M cho c\xE1c t\xE0i kho\u1EA3n (\u0111\u1ED5i l\u1EA1i trong m\xE0n Nh\xE2n s\u1EF1 & ph\xE2n quy\u1EC1n):");
    r.temp.forEach((t) => console.log("  " + t.username.padEnd(16) + t.password + "   (" + t.name + ")"));
  }
}
async function main() {
  const cmd = process.argv[2];
  for (let i = 0; ; i++) {
    try {
      await migrate();
      break;
    } catch (e) {
      if (i > 30) throw e;
      await new Promise((r) => setTimeout(r, 2e3));
    }
  }
  if (cmd === "import-gas") {
    printImport(await importFromGas());
    return pool.end();
  }
  if (cmd === "import-file") {
    printImport(await importDB(JSON.parse(fs.readFileSync(process.argv[3], "utf8")), { force: process.argv.includes("--force") }));
    return pool.end();
  }
  if (cmd === "count-users") {
    console.log((await one(pool, "SELECT count(*)::int AS n FROM users")).n);
    return pool.end();
  }
  if (cmd === "create-director") {
    const [, , , username, password, ...nameParts] = process.argv;
    if (!username || !password) throw new Error("C\xE1ch d\xF9ng: create-director <t\xEAn \u0111\u0103ng nh\u1EADp> <m\u1EADt kh\u1EA9u> [h\u1ECD t\xEAn]");
    await pool.query(
      `INSERT INTO users(id,username,pass_hash,name,role,color) VALUES($1,$2,$3,$4,'director','#1f2937')`,
      ["u" + crypto.randomBytes(4).toString("hex"), username, hashPassword(password), nameParts.join(" ") || "Gi\xE1m \u0111\u1ED1c"]
    );
    console.log("\u0110\xE3 t\u1EA1o t\xE0i kho\u1EA3n Gi\xE1m \u0111\u1ED1c: " + username);
    return pool.end();
  }
  if (cmd === "set-password") {
    const r = await pool.query("UPDATE users SET pass_hash=$2 WHERE username=$1", [process.argv[3], hashPassword(process.argv[4])]);
    console.log(r.rowCount ? "\u0110\xE3 \u0111\u1ED5i m\u1EADt kh\u1EA9u." : "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n.");
    return pool.end();
  }
  if (!TOKEN_SECRET || TOKEN_SECRET.length < 32) throw new Error("TOKEN_SECRET ch\u01B0a \u0111\u01B0\u1EE3c \u0111\u1EB7t (>= 32 k\xFD t\u1EF1).");
  http.createServer((req, res) => {
    handle(req, res);
  }).listen(PORT, () => console.log("OKR API v" + VERSION + " listening on " + PORT));
}
main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
