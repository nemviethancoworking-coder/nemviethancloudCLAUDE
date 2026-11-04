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

// node_modules/nodemailer/dist/cjs/punycode/index.js
var require_punycode = __commonJS({
  "node_modules/nodemailer/dist/cjs/punycode/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.toUnicode = exports2.toASCII = exports2.encode = exports2.decode = exports2.ucs2 = exports2.version = void 0;
    var maxInt = 2147483647;
    var base = 36;
    var tMin = 1;
    var tMax = 26;
    var skew = 38;
    var damp = 700;
    var initialBias = 72;
    var initialN = 128;
    var delimiter = "-";
    var regexPunycode = /^xn--/;
    var regexNonASCII = /[^\0-\x7F]/;
    var regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g;
    var errors = {
      overflow: "Overflow: input needs wider integers to process",
      "not-basic": "Illegal input >= 0x80 (not a basic code point)",
      "invalid-input": "Invalid input"
    };
    var baseMinusTMin = base - tMin;
    var floor = Math.floor;
    var stringFromCharCode = String.fromCharCode;
    function error(type) {
      throw new RangeError(errors[type]);
    }
    function map(array, callback) {
      const result = [];
      let length = array.length;
      while (length--) {
        result[length] = callback(array[length]);
      }
      return result;
    }
    function mapDomain(domain, callback) {
      const parts = domain.split("@");
      let result = "";
      if (parts.length > 1) {
        result = parts[0] + "@";
        domain = parts[1];
      }
      domain = domain.replace(regexSeparators, ".");
      const labels = domain.split(".");
      const encoded = map(labels, callback).join(".");
      return result + encoded;
    }
    function ucs2decode(string) {
      const output = [];
      let counter = 0;
      const length = string.length;
      while (counter < length) {
        const value = string.charCodeAt(counter++);
        if (value >= 55296 && value <= 56319 && counter < length) {
          const extra = string.charCodeAt(counter++);
          if ((extra & 64512) == 56320) {
            output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
          } else {
            output.push(value);
            counter--;
          }
        } else {
          output.push(value);
        }
      }
      return output;
    }
    var ucs2encode = (codePoints) => String.fromCodePoint(...codePoints);
    var basicToDigit = function(codePoint) {
      if (codePoint >= 48 && codePoint < 58) {
        return 26 + (codePoint - 48);
      }
      if (codePoint >= 65 && codePoint < 91) {
        return codePoint - 65;
      }
      if (codePoint >= 97 && codePoint < 123) {
        return codePoint - 97;
      }
      return base;
    };
    var digitToBasic = function(digit, flag) {
      return digit + 22 + 75 * Number(digit < 26) - (Number(flag != 0) << 5);
    };
    var adapt = function(delta, numPoints, firstTime) {
      let k = 0;
      delta = firstTime ? floor(delta / damp) : delta >> 1;
      delta += floor(delta / numPoints);
      for (
        ;
        /* no initialization */
        delta > baseMinusTMin * tMax >> 1;
        k += base
      ) {
        delta = floor(delta / baseMinusTMin);
      }
      return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
    };
    var decode = function(input) {
      const output = [];
      const inputLength = input.length;
      let i = 0;
      let n = initialN;
      let bias = initialBias;
      let basic = input.lastIndexOf(delimiter);
      if (basic < 0) {
        basic = 0;
      }
      for (let j = 0; j < basic; ++j) {
        if (input.charCodeAt(j) >= 128) {
          error("not-basic");
        }
        output.push(input.charCodeAt(j));
      }
      for (let index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
        const oldi = i;
        for (let w = 1, k = base; ; k += base) {
          if (index >= inputLength) {
            error("invalid-input");
          }
          const digit = basicToDigit(input.charCodeAt(index++));
          if (digit >= base) {
            error("invalid-input");
          }
          if (digit > floor((maxInt - i) / w)) {
            error("overflow");
          }
          i += digit * w;
          const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
          if (digit < t) {
            break;
          }
          const baseMinusT = base - t;
          if (w > floor(maxInt / baseMinusT)) {
            error("overflow");
          }
          w *= baseMinusT;
        }
        const out = output.length + 1;
        bias = adapt(i - oldi, out, oldi == 0);
        if (floor(i / out) > maxInt - n) {
          error("overflow");
        }
        n += floor(i / out);
        i %= out;
        output.splice(i++, 0, n);
      }
      return String.fromCodePoint(...output);
    };
    exports2.decode = decode;
    var encode = function(input) {
      const output = [];
      const codePoints = ucs2decode(input);
      const inputLength = codePoints.length;
      let n = initialN;
      let delta = 0;
      let bias = initialBias;
      for (const currentValue of codePoints) {
        if (currentValue < 128) {
          output.push(stringFromCharCode(currentValue));
        }
      }
      const basicLength = output.length;
      let handledCPCount = basicLength;
      if (basicLength) {
        output.push(delimiter);
      }
      while (handledCPCount < inputLength) {
        let m = maxInt;
        for (const currentValue of codePoints) {
          if (currentValue >= n && currentValue < m) {
            m = currentValue;
          }
        }
        const handledCPCountPlusOne = handledCPCount + 1;
        if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
          error("overflow");
        }
        delta += (m - n) * handledCPCountPlusOne;
        n = m;
        for (const currentValue of codePoints) {
          if (currentValue < n && ++delta > maxInt) {
            error("overflow");
          }
          if (currentValue === n) {
            let q = delta;
            for (let k = base; ; k += base) {
              const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
              if (q < t) {
                break;
              }
              const qMinusT = q - t;
              const baseMinusT = base - t;
              output.push(stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0)));
              q = floor(qMinusT / baseMinusT);
            }
            output.push(stringFromCharCode(digitToBasic(q, 0)));
            bias = adapt(delta, handledCPCountPlusOne, handledCPCount === basicLength);
            delta = 0;
            ++handledCPCount;
          }
        }
        ++delta;
        ++n;
      }
      return output.join("");
    };
    exports2.encode = encode;
    var toUnicode = function(input) {
      return mapDomain(input, function(string) {
        return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
      });
    };
    exports2.toUnicode = toUnicode;
    var toASCII = function(input) {
      return mapDomain(input, function(string) {
        return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
      });
    };
    exports2.toASCII = toASCII;
    exports2.version = "2.3.1";
    exports2.ucs2 = {
      decode: ucs2decode,
      encode: ucs2encode
    };
  }
});

// node_modules/nodemailer/dist/cjs/shared/url.js
var require_url = __commonJS({
  "node_modules/nodemailer/dist/cjs/shared/url.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.resolve = exports2.parse = void 0;
    var node_net_1 = __importDefault(require("node:net"));
    var node_url_1 = __importDefault(require("node:url"));
    var punycode = __importStar(require_punycode());
    var SLASHLESS_AUTHORITY = /^([a-zA-Z][a-zA-Z0-9+.-]*:)(?!\/\/)([\s\S]+)$/;
    function stripSurroundingWhitespace(input) {
      let start = 0;
      let end = input.length;
      while (start < end && input.charCodeAt(start) <= 32) {
        start++;
      }
      while (end > start && input.charCodeAt(end - 1) <= 32) {
        end--;
      }
      return input.slice(start, end);
    }
    var LEGACY_TRIM = /^[\x00-\x20\u00a0\ufeff]+/;
    var AUTHORITY = /^([a-zA-Z0-9+.-]+:)?[\\/]{2}([^\\/?#]*)/;
    var FORBIDDEN_HOST_CHARS = /[\x00-\x20#/:<>?@[\\\]^|\x7f]/;
    var CONTROL_CHARS = /[\x00-\x1f\x7f]/;
    function invalidUrl(input) {
      const err = new TypeError("Invalid URL");
      err.code = "ERR_INVALID_URL";
      err.input = input;
      return err;
    }
    function legacyParse(input, parseQueryString, whatwgError, slashesDenoteHost) {
      const parsed = node_url_1.default.parse(input, parseQueryString, slashesDenoteHost);
      const authority = AUTHORITY.exec(input.replace(LEGACY_TRIM, ""));
      if (authority && (authority[1] || parsed.hostname !== null)) {
        const written = authority[2].slice(authority[2].lastIndexOf("@") + 1);
        if (!written || CONTROL_CHARS.test(written) || (parsed.host || "").toLowerCase() !== punycode.toASCII(written.toLowerCase())) {
          throw whatwgError;
        }
        if (written.charAt(0) === "[" && !node_net_1.default.isIPv6(written.slice(1, written.indexOf("]")))) {
          throw whatwgError;
        }
      } else if (parsed.hostname !== null) {
        throw whatwgError;
      }
      const legacyAuth = parsed.auth === null || parsed.auth === void 0 ? null : parsed.auth.split(":");
      const result = parsed;
      result.username = legacyAuth ? legacyAuth.shift() : null;
      result.password = legacyAuth && legacyAuth.length ? legacyAuth.join(":") : null;
      return result;
    }
    function safeDecode(str2) {
      try {
        return decodeURIComponent(str2);
      } catch (_err) {
        return str2;
      }
    }
    function normalizeHostname(raw, href) {
      const hostname = raw || "";
      if (!hostname) {
        return "";
      }
      if (hostname.charAt(0) === "[" && hostname.charAt(hostname.length - 1) === "]") {
        return hostname.slice(1, -1);
      }
      const decoded = safeDecode(hostname);
      const mapped = FORBIDDEN_HOST_CHARS.test(decoded) ? "" : node_url_1.default.domainToASCII(decoded);
      if (!mapped) {
        throw invalidUrl(href);
      }
      return mapped;
    }
    var parse = (input, parseQueryString) => {
      input = stripSurroundingWhitespace(input || "");
      const slashless = SLASHLESS_AUTHORITY.exec(input);
      const normalized = slashless ? slashless[1] + "//" + slashless[2] : input;
      let u;
      try {
        u = new URL(normalized);
      } catch (err) {
        return legacyParse(normalized, parseQueryString, err);
      }
      const hostname = normalizeHostname(u.hostname, u.href);
      const port = u.port || null;
      const pathname = u.pathname || null;
      const search = u.search || null;
      let auth = null;
      let username = null;
      let password = null;
      if (u.username || u.password) {
        username = safeDecode(u.username);
        password = u.password ? safeDecode(u.password) : null;
        auth = username + (password !== null ? ":" + password : "");
      }
      let query;
      if (parseQueryString) {
        const parsed = /* @__PURE__ */ Object.create(null);
        u.searchParams.forEach((value, key) => {
          if (Object.prototype.hasOwnProperty.call(parsed, key)) {
            const existing = parsed[key];
            if (Array.isArray(existing)) {
              existing.push(value);
            } else {
              parsed[key] = [existing, value];
            }
          } else {
            parsed[key] = value;
          }
        });
        query = parsed;
      } else {
        query = search ? search.slice(1) : null;
      }
      return {
        protocol: u.protocol || null,
        host: u.host || null,
        hostname,
        port,
        pathname,
        search,
        path: (pathname || "") + (search || "") || null,
        href: u.href,
        auth,
        username,
        password,
        query
      };
    };
    exports2.parse = parse;
    var resolve = (from, to) => {
      try {
        return new URL(to, from).href;
      } catch (err) {
        legacyParse(from, false, err, true);
        legacyParse(to, false, err, true);
        return node_url_1.default.resolve(from, to);
      }
    };
    exports2.resolve = resolve;
  }
});

// node_modules/nodemailer/dist/cjs/fetch/cookies.js
var require_cookies = __commonJS({
  "node_modules/nodemailer/dist/cjs/fetch/cookies.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_net_1 = __importDefault(require("node:net"));
    var urllib = __importStar(require_url());
    var SESSION_TIMEOUT = 1800;
    var Cookies = class {
      constructor(options) {
        this.options = options || {};
        this.cookies = [];
      }
      /**
       * Stores a cookie string to the cookie storage
       *
       * @param cookieStr Value from the 'Set-Cookie:' header
       * @param url Current URL
       */
      set(cookieStr, url) {
        const urlparts = urllib.parse(url || "");
        const cookie = this.parse(cookieStr);
        let domain;
        if (cookie.domain) {
          domain = cookie.domain.replace(/^\./, "");
          if (
            // can't be valid if the requested domain is shorter than current hostname
            urlparts.hostname.length < domain.length || // a top level domain is not a valid scope, 'Domain=com' would otherwise be
            // sent to every .com host. A trailing dot does not make 'com.' any better
            domain.indexOf(".") < 0 || domain.endsWith(".") || // an IP address has no subdomains, so cookies set on it stay host-only
            node_net_1.default.isIP(urlparts.hostname) || // prefix domains with dot to be sure that partial matches are not used
            !("." + urlparts.hostname).endsWith("." + domain)
          ) {
            cookie.domain = urlparts.hostname;
          }
        } else {
          cookie.domain = urlparts.hostname;
        }
        if (!cookie.path) {
          cookie.path = this.getPath(urlparts.pathname);
        }
        if (!cookie.expires) {
          cookie.expires = new Date(Date.now() + (Number(this.options.sessionTimeout || SESSION_TIMEOUT) || SESSION_TIMEOUT) * 1e3);
        }
        return this.add(cookie);
      }
      /**
       * Returns cookie string for the 'Cookie:' header.
       *
       * @param url URL to check for
       * @returns Cookie header or empty string if no matches were found
       */
      get(url) {
        return this.list(url).map((cookie) => cookie.name + "=" + cookie.value).join("; ");
      }
      /**
       * Lists all valied cookie objects for the specified URL
       *
       * @param url URL to check for
       * @returns An array of cookie objects
       */
      list(url) {
        const result = [];
        for (let i = this.cookies.length - 1; i >= 0; i--) {
          const cookie = this.cookies[i];
          if (this.isExpired(cookie)) {
            this.cookies.splice(i, 1);
            continue;
          }
          if (this.match(cookie, url)) {
            result.unshift(cookie);
          }
        }
        return result;
      }
      /**
       * Parses cookie string from the 'Set-Cookie:' header
       *
       * @param cookieStr String from the 'Set-Cookie:' header
       * @returns Cookie object
       */
      parse(cookieStr) {
        const cookie = {};
        let hasNameValue = false;
        (cookieStr || "").toString().split(";").forEach((cookiePart) => {
          if (!cookiePart.trim()) {
            return;
          }
          const valueParts = cookiePart.split("=");
          const name = valueParts.shift().trim();
          let value = valueParts.join("=").trim();
          let domain;
          if (!hasNameValue) {
            hasNameValue = true;
            if (name) {
              cookie.name = name;
              cookie.value = value;
            }
            return;
          }
          switch (name.toLowerCase()) {
            case "expires": {
              const expires = new Date(value);
              if (expires.toString() !== "Invalid Date") {
                cookie.expires = expires;
              }
              break;
            }
            case "path":
              cookie.path = value;
              break;
            case "domain":
              domain = value.toLowerCase();
              if (domain.length && domain.charAt(0) !== ".") {
                domain = "." + domain;
              }
              cookie.domain = domain;
              break;
            case "max-age":
              cookie.expires = new Date(Date.now() + (Number(value) || 0) * 1e3);
              break;
            case "secure":
              cookie.secure = true;
              break;
            case "httponly":
              cookie.httponly = true;
              break;
          }
        });
        return cookie;
      }
      /**
       * Checks if a cookie object is valid for a specified URL
       *
       * @param cookie Cookie object
       * @param url URL to check for
       * @returns true if cookie is valid for specifiec URL
       */
      match(cookie, url) {
        const urlparts = urllib.parse(url || "");
        if (urlparts.hostname !== cookie.domain && (cookie.domain.charAt(0) !== "." || ("." + urlparts.hostname).substr(-cookie.domain.length) !== cookie.domain)) {
          return false;
        }
        const pathname = urlparts.pathname || "/";
        const cookiePath = cookie.path;
        const pathMatches = pathname === cookiePath || pathname.startsWith(cookiePath) && (cookiePath.endsWith("/") || pathname.charAt(cookiePath.length) === "/");
        if (!pathMatches) {
          return false;
        }
        if (cookie.secure && urlparts.protocol !== "https:") {
          return false;
        }
        return true;
      }
      /**
       * Adds (or updates/removes if needed) a cookie object to the cookie storage
       *
       * @param cookie Cookie value to be stored
       */
      add(cookie) {
        if (!cookie || !cookie.name) {
          return false;
        }
        for (let i = 0, len = this.cookies.length; i < len; i++) {
          if (this.compare(this.cookies[i], cookie)) {
            if (this.isExpired(cookie)) {
              this.cookies.splice(i, 1);
              return false;
            }
            this.cookies[i] = cookie;
            return true;
          }
        }
        if (!this.isExpired(cookie)) {
          this.cookies.push(cookie);
        }
        return true;
      }
      /**
       * Checks if two cookie objects are the same
       *
       * @param a Cookie to check against
       * @param b Cookie to check against
       * @returns True, if the cookies are the same
       */
      compare(a, b) {
        return a.name === b.name && a.path === b.path && a.domain === b.domain && a.secure === b.secure && a.httponly === b.httponly;
      }
      /**
       * Checks if a cookie is expired
       *
       * @param cookie Cookie object to check against
       * @returns True, if the cookie is expired
       */
      isExpired(cookie) {
        return cookie.expires && cookie.expires < /* @__PURE__ */ new Date() || !cookie.value;
      }
      /**
       * Returns the default path for an URL path argument, the default-path of
       * RFC 6265 section 5.1.4. A cookie that carries no Path attribute is scoped
       * to the directory of the URL it was set from
       *
       * @param pathname
       * @returns Default path
       */
      getPath(pathname) {
        const pathParts = (pathname || "/").split("/");
        pathParts.pop();
        const path = pathParts.join("/").trim();
        if (path.charAt(0) !== "/") {
          return "/";
        }
        return path;
      }
    };
    exports2.default = Cookies;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/package-info.js
var require_package_info = __commonJS({
  "node_modules/nodemailer/dist/cjs/package-info.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.homepage = exports2.version = exports2.name = void 0;
    exports2.name = "nodemailer";
    exports2.version = "10.3.1";
    exports2.homepage = "https://nodemailer.com/";
  }
});

// node_modules/nodemailer/dist/cjs/errors.js
var require_errors = __commonJS({
  "node_modules/nodemailer/dist/cjs/errors.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ERR_ACCESS_DENIED = exports2.isPermanentResponseCode = exports2.isTransientError = exports2.EFETCH = exports2.EURLACCESS = exports2.EFILEACCESS = exports2.EPROXY = exports2.ECONFIG = exports2.ESES = exports2.ESENDMAIL = exports2.EMAXRECIPIENTS = exports2.EMAXLIMIT = exports2.EOAUTH2 = exports2.ENOAUTH = exports2.EAUTH = exports2.ESTREAM = exports2.EOTP = exports2.EMESSAGE = exports2.EENVELOPE = exports2.EPROTOCOL = exports2.EREQUIRETLS = exports2.ETLS = exports2.EDNS = exports2.ESOCKET = exports2.ETIMEDOUT = exports2.ECONNECTION = exports2.ERROR_CODES = void 0;
    exports2.ERROR_CODES = {
      // Connection errors
      ECONNECTION: "Connection closed unexpectedly",
      ETIMEDOUT: "Connection or operation timed out",
      ESOCKET: "Socket-level error",
      EDNS: "DNS resolution failed",
      // TLS/Security errors
      ETLS: "TLS handshake or STARTTLS failed",
      EREQUIRETLS: "REQUIRETLS not supported by server (RFC 8689)",
      // Protocol errors
      EPROTOCOL: "Invalid SMTP server response",
      EENVELOPE: "Invalid mail envelope (sender or recipients)",
      EMESSAGE: "Message delivery error",
      EOTP: "Invalid one-time passcode data (otp option)",
      ESTREAM: "Stream processing error",
      // Authentication errors
      EAUTH: "Authentication failed",
      ENOAUTH: "Authentication credentials not provided",
      EOAUTH2: "OAuth2 token generation or refresh error",
      // Resource errors
      EMAXLIMIT: "Pool resource limit reached (max messages per connection)",
      EMAXRECIPIENTS: "Recipient count exceeds maxRecipients",
      // Transport-specific errors
      ESENDMAIL: "Sendmail command error",
      ESES: "AWS SES transport error",
      // Configuration and access errors
      ECONFIG: "Invalid configuration",
      EPROXY: "Proxy connection error",
      EFILEACCESS: "File access rejected (disableFileAccess is set)",
      EURLACCESS: "URL access rejected (disableUrlAccess is set)",
      EFETCH: "HTTP fetch error"
    };
    exports2.ECONNECTION = "ECONNECTION";
    exports2.ETIMEDOUT = "ETIMEDOUT";
    exports2.ESOCKET = "ESOCKET";
    exports2.EDNS = "EDNS";
    exports2.ETLS = "ETLS";
    exports2.EREQUIRETLS = "EREQUIRETLS";
    exports2.EPROTOCOL = "EPROTOCOL";
    exports2.EENVELOPE = "EENVELOPE";
    exports2.EMESSAGE = "EMESSAGE";
    exports2.EOTP = "EOTP";
    exports2.ESTREAM = "ESTREAM";
    exports2.EAUTH = "EAUTH";
    exports2.ENOAUTH = "ENOAUTH";
    exports2.EOAUTH2 = "EOAUTH2";
    exports2.EMAXLIMIT = "EMAXLIMIT";
    exports2.EMAXRECIPIENTS = "EMAXRECIPIENTS";
    exports2.ESENDMAIL = "ESENDMAIL";
    exports2.ESES = "ESES";
    exports2.ECONFIG = "ECONFIG";
    exports2.EPROXY = "EPROXY";
    exports2.EFILEACCESS = "EFILEACCESS";
    exports2.EURLACCESS = "EURLACCESS";
    exports2.EFETCH = "EFETCH";
    var isTransientError = (err) => err.responseCode === 421 || err.code === exports2.ECONNECTION || err.code === exports2.ESOCKET || err.code === exports2.ETIMEDOUT;
    exports2.isTransientError = isTransientError;
    var isPermanentResponseCode = (responseCode) => responseCode >= 500 && responseCode < 600 && responseCode !== 503;
    exports2.isPermanentResponseCode = isPermanentResponseCode;
    exports2.ERR_ACCESS_DENIED = "ERR_ACCESS_DENIED";
  }
});

// node_modules/nodemailer/dist/cjs/shared/objects.js
var require_objects = __commonJS({
  "node_modules/nodemailer/dist/cjs/shared/objects.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.copyOwnKeys = exports2.isProtoKey = void 0;
    var isProtoKey = (key) => key === "__proto__";
    exports2.isProtoKey = isProtoKey;
    var copyOwnKeys = (target, source, skip) => {
      Object.keys(source || {}).forEach((key) => {
        if ((0, exports2.isProtoKey)(key) || skip && skip(key)) {
          return;
        }
        target[key] = source[key];
      });
      return target;
    };
    exports2.copyOwnKeys = copyOwnKeys;
  }
});

// node_modules/nodemailer/dist/cjs/fetch/index.js
var require_fetch = __commonJS({
  "node_modules/nodemailer/dist/cjs/fetch/index.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_http_1 = __importDefault(require("node:http"));
    var node_https_1 = __importDefault(require("node:https"));
    var urllib = __importStar(require_url());
    var node_zlib_1 = __importDefault(require("node:zlib"));
    var node_stream_1 = require("node:stream");
    var cookies_js_1 = __importDefault(require_cookies());
    var packageData = __importStar(require_package_info());
    var node_net_1 = __importDefault(require("node:net"));
    var errors = __importStar(require_errors());
    var objects_js_1 = require_objects();
    var MAX_REDIRECTS = 5;
    var DEFAULT_TIMEOUT = 60 * 1e3;
    var DEFAULT_MAX_TIME = 2 * 60 * 1e3;
    var DEFAULT_MAX_BYTES = 64 * 1024 * 1024;
    var TLS_OPTION_KEYS = [
      "ALPNProtocols",
      "ca",
      "cert",
      "checkServerIdentity",
      "ciphers",
      "crl",
      "dhparam",
      "ecdhCurve",
      "honorCipherOrder",
      "key",
      "maxVersion",
      "minVersion",
      "passphrase",
      "pfx",
      "rejectUnauthorized",
      "secureContext",
      "secureOptions",
      "secureProtocol",
      "servername",
      "sessionIdContext",
      "sigalgs"
    ];
    function setFetchCode(err) {
      if (err.code !== errors.ERR_ACCESS_DENIED) {
        err.code = errors.EFETCH;
      }
    }
    function parseFetchUrl(url) {
      let parsed;
      try {
        parsed = urllib.parse(url);
      } catch (_err) {
        return false;
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return false;
      }
      return parsed;
    }
    function fetchPort(parsed) {
      return parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80;
    }
    function nmfetch(url, options) {
      options = options || {};
      options.fetchRes = options.fetchRes || new node_stream_1.PassThrough();
      options.cookies = options.cookies || new cookies_js_1.default();
      options.redirects = options.redirects || 0;
      options.maxRedirects = isNaN(options.maxRedirects) ? MAX_REDIRECTS : options.maxRedirects;
      if (!options.deadline) {
        options.maxTime = typeof options.maxTime === "number" && options.maxTime >= 0 ? options.maxTime : DEFAULT_MAX_TIME;
        options.deadline = options.maxTime ? Date.now() + options.maxTime : 0;
      }
      const fetchRes = options.fetchRes;
      const parsed = parseFetchUrl(url);
      if (!parsed) {
        if (options.body && typeof options.body.destroy === "function") {
          options.body.on("error", () => false);
          options.body.destroy();
        }
        setImmediate(() => {
          const err = new Error("Unsupported protocol for URL " + url);
          err.code = errors.EFETCH;
          err.sourceUrl = url;
          fetchRes.emit("error", err);
        });
        return fetchRes;
      }
      if (options.cookie) {
        [].concat(options.cookie || []).forEach((cookie) => {
          options.cookies.set(cookie, url);
        });
        options.cookie = false;
      }
      let method = (options.method || "").toString().trim().toUpperCase() || "GET";
      let finished = false;
      let cookies;
      let body;
      const handler = parsed.protocol === "https:" ? node_https_1.default : node_http_1.default;
      const headers = {
        "accept-encoding": "gzip,deflate",
        "user-agent": "nodemailer/" + packageData.version
      };
      Object.keys(options.headers || {}).forEach((key) => {
        if ((0, objects_js_1.isProtoKey)(key.toLowerCase().trim())) {
          return;
        }
        headers[key.toLowerCase().trim()] = options.headers[key];
      });
      if (options.userAgent) {
        headers["user-agent"] = options.userAgent;
      }
      if (parsed.auth) {
        headers.Authorization = "Basic " + Buffer.from(parsed.auth).toString("base64");
      }
      if (cookies = options.cookies.get(url)) {
        headers.cookie = cookies;
      }
      if (options.body) {
        if (options.contentType !== false) {
          headers["Content-Type"] = options.contentType || "application/x-www-form-urlencoded";
        }
        if (typeof options.body.pipe === "function") {
          headers["Transfer-Encoding"] = "chunked";
          body = options.body;
          body.on("error", (err) => {
            if (finished) {
              return;
            }
            finished = true;
            setFetchCode(err);
            err.sourceUrl = url;
            fetchRes.emit("error", err);
          });
        } else {
          if (options.body instanceof Buffer) {
            body = options.body;
          } else if (typeof options.body === "object") {
            try {
              body = Buffer.from(Object.keys(options.body).map((key) => {
                const value = options.body[key].toString().trim();
                return encodeURIComponent(key) + "=" + encodeURIComponent(value);
              }).join("&"));
            } catch (E) {
              finished = true;
              E.code = errors.EFETCH;
              E.sourceUrl = url;
              setImmediate(() => fetchRes.emit("error", E));
              return fetchRes;
            }
          } else {
            body = Buffer.from(options.body.toString().trim());
          }
          headers["Content-Type"] = options.contentType || "application/x-www-form-urlencoded";
          headers["Content-Length"] = body.length;
        }
        method = (options.method || "").toString().trim().toUpperCase() || "POST";
      }
      let req;
      const reqOptions = {
        method,
        host: parsed.hostname,
        path: parsed.path,
        port: fetchPort(parsed),
        headers,
        // Validate TLS certificates by default. Callers that genuinely need to
        // reach a self-signed/internal host opt out explicitly with
        // options.tls = { rejectUnauthorized: false }.
        rejectUnauthorized: true,
        agent: false
      };
      if (options.tls) {
        Object.keys(options.tls).forEach((key) => {
          if (TLS_OPTION_KEYS.includes(key)) {
            reqOptions[key] = options.tls[key];
          }
        });
      }
      if (parsed.protocol === "https:" && parsed.hostname && parsed.hostname !== reqOptions.host && !node_net_1.default.isIP(parsed.hostname) && !reqOptions.servername) {
        reqOptions.servername = parsed.hostname;
      }
      try {
        req = handler.request(reqOptions);
      } catch (E) {
        finished = true;
        setImmediate(() => {
          setFetchCode(E);
          E.sourceUrl = url;
          fetchRes.emit("error", E);
        });
        return fetchRes;
      }
      let deadlineTimer;
      const clearDeadline = () => {
        if (deadlineTimer) {
          clearTimeout(deadlineTimer);
          deadlineTimer = void 0;
        }
      };
      const fail = (err, sourceUrl = url) => {
        if (finished) {
          return;
        }
        finished = true;
        clearDeadline();
        setFetchCode(err);
        err.sourceUrl = sourceUrl;
        fetchRes.emit("error", err);
        req.abort();
      };
      const timeout = typeof options.timeout === "number" && options.timeout >= 0 ? options.timeout : DEFAULT_TIMEOUT;
      if (timeout) {
        req.setTimeout(timeout, () => fail(new Error("Request Timeout")));
      }
      if (options.deadline) {
        deadlineTimer = setTimeout(() => fail(new Error("Request exceeded the allowed " + options.maxTime + " ms")), Math.max(options.deadline - Date.now(), 1));
        deadlineTimer.unref();
      }
      req.on("error", (err) => fail(err));
      fetchRes.once("close", () => {
        clearDeadline();
        if (finished || fetchRes.readableEnded) {
          return;
        }
        finished = true;
        req.destroy();
      });
      req.on("response", (res) => {
        let inflate;
        if (finished) {
          return;
        }
        switch (res.headers["content-encoding"]) {
          case "gzip":
          case "deflate":
            inflate = node_zlib_1.default.createUnzip();
            break;
        }
        if (res.headers["set-cookie"]) {
          [].concat(res.headers["set-cookie"] || []).forEach((cookie) => {
            options.cookies.set(cookie, url);
          });
        }
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          options.redirects++;
          if (options.redirects > options.maxRedirects) {
            return fail(new Error("Maximum redirect count exceeded"));
          }
          options.method = "GET";
          options.body = false;
          let redirectUrl;
          try {
            redirectUrl = urllib.resolve(url, res.headers.location);
          } catch (_err) {
            redirectUrl = res.headers.location;
          }
          const redirectParsed = parseFetchUrl(redirectUrl);
          if (!redirectParsed) {
            return fail(new Error("Unsupported protocol for URL " + redirectUrl), redirectUrl);
          }
          const crossOrigin = redirectParsed.protocol !== parsed.protocol || redirectParsed.hostname !== parsed.hostname || fetchPort(redirectParsed) !== fetchPort(parsed);
          if (options.headers && crossOrigin) {
            const sensitive = ["authorization", "cookie", "proxy-authorization"];
            Object.keys(options.headers).forEach((key) => {
              if (sensitive.includes(key.toLowerCase().trim())) {
                delete options.headers[key];
              }
            });
          }
          finished = true;
          clearDeadline();
          res.resume();
          req.abort();
          return nmfetch(redirectUrl, options);
        }
        fetchRes.statusCode = res.statusCode;
        fetchRes.headers = res.headers;
        if (res.statusCode >= 300 && !options.allowErrorResponse) {
          return fail(new Error("Invalid status code " + res.statusCode));
        }
        res.on("error", (err) => fail(err));
        res.once("end", () => clearDeadline());
        const maxBytes = typeof options.maxBytes === "number" && options.maxBytes > 0 ? options.maxBytes : DEFAULT_MAX_BYTES;
        const source = inflate || res;
        let received = 0;
        source.on("data", (chunk) => {
          received += chunk.length;
          if (received <= maxBytes || finished) {
            return;
          }
          source.unpipe(fetchRes);
          fail(new Error("Response size exceeds the allowed " + maxBytes + " bytes"));
        });
        if (inflate) {
          res.pipe(inflate).pipe(fetchRes);
          inflate.on("error", (err) => fail(err));
        } else {
          res.pipe(fetchRes);
        }
      });
      setImmediate(() => {
        if (body) {
          try {
            if (typeof body.pipe === "function") {
              return body.pipe(req);
            }
            req.write(body);
          } catch (err) {
            return fail(err);
          }
        }
        req.end();
      });
      return fetchRes;
    }
    nmfetch.Cookies = cookies_js_1.default;
    nmfetch.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;
    nmfetch.DEFAULT_MAX_TIME = DEFAULT_MAX_TIME;
    exports2.default = nmfetch;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/shared/index.js
var require_shared = __commonJS({
  "node_modules/nodemailer/dist/cjs/shared/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.encodeXText = exports2.assign = exports2.parseDataURI = exports2.callbackPromise = exports2.getLogger = exports2._logFunc = exports2.parseConnectionUrl = exports2.resolveHostname = exports2.dnsCache = exports2._readNetworkInterfaces = exports2.networkInterfaces = exports2._resetCacheCleanup = exports2._lastCacheCleanup = exports2.copyOwnKeys = exports2.isProtoKey = void 0;
    exports2.resolveContent = resolveContent;
    exports2.recordStreamErrors = recordStreamErrors;
    exports2.destroyStream = destroyStream;
    exports2.unreadableStreamError = unreadableStreamError;
    exports2.resolveStream = resolveStream;
    var urllib = __importStar(require_url());
    var node_util_1 = __importDefault(require("node:util"));
    var node_fs_1 = __importDefault(require("node:fs"));
    var index_js_1 = __importDefault(require_fetch());
    var errors = __importStar(require_errors());
    var objects_js_1 = require_objects();
    Object.defineProperty(exports2, "isProtoKey", { enumerable: true, get: function() {
      return objects_js_1.isProtoKey;
    } });
    Object.defineProperty(exports2, "copyOwnKeys", { enumerable: true, get: function() {
      return objects_js_1.copyOwnKeys;
    } });
    var node_dns_1 = __importDefault(require("node:dns"));
    var node_net_1 = __importDefault(require("node:net"));
    var node_os_1 = __importDefault(require("node:os"));
    var node_stream_1 = require("node:stream");
    var DNS_TTL = 5 * 60 * 1e3;
    var CACHE_CLEANUP_INTERVAL = 30 * 1e3;
    var MAX_CACHE_SIZE = 1e3;
    var lastCacheCleanup = 0;
    var _lastCacheCleanup = () => lastCacheCleanup;
    exports2._lastCacheCleanup = _lastCacheCleanup;
    var _resetCacheCleanup = () => {
      lastCacheCleanup = 0;
    };
    exports2._resetCacheCleanup = _resetCacheCleanup;
    var networkInterfacesRead = false;
    var _readNetworkInterfaces = () => {
      if (!networkInterfacesRead) {
        networkInterfacesRead = true;
        try {
          exports2.networkInterfaces = node_os_1.default.networkInterfaces();
        } catch (_err) {
        }
      }
      return exports2.networkInterfaces;
    };
    exports2._readNetworkInterfaces = _readNetworkInterfaces;
    var isFamilySupported = (family, allowInternal) => {
      const addresses = Object.values((0, exports2._readNetworkInterfaces)() || {}).flat();
      if (!addresses.length) {
        return true;
      }
      return addresses.filter((i) => !i.internal || allowInternal).some((i) => i.family === "IPv" + family || i.family === family);
    };
    var resolve = (family, hostname, options, callback) => {
      options = options || {};
      if (!isFamilySupported(family, options.allowInternalNetworkInterfaces)) {
        callback(null, []);
        return null;
      }
      const dnsResolver = node_dns_1.default.Resolver ? new node_dns_1.default.Resolver(options) : node_dns_1.default;
      dnsResolver["resolve" + family](hostname, (err, addresses) => {
        if (err) {
          switch (err.code) {
            case node_dns_1.default.NODATA:
            case node_dns_1.default.NOTFOUND:
            case node_dns_1.default.NOTIMP:
            case node_dns_1.default.SERVFAIL:
            case node_dns_1.default.CONNREFUSED:
            case node_dns_1.default.REFUSED:
            case "EAI_AGAIN":
              return callback(null, []);
          }
          return callback(err);
        }
        return callback(null, Array.isArray(addresses) ? addresses : [].concat(addresses || []));
      });
      return node_dns_1.default.Resolver ? dnsResolver : null;
    };
    exports2.dnsCache = /* @__PURE__ */ new Map();
    var formatDNSValue = (value, extra) => {
      if (!value) {
        return Object.assign({}, extra || {});
      }
      const addresses = value.addresses || [];
      const host = addresses.length > 0 ? addresses[Math.floor(Math.random() * addresses.length)] : null;
      return Object.assign({
        host,
        // Include all addresses for connection fallback support
        _addresses: addresses
      }, extra || {});
    };
    var resolveHostname = (options, callback) => {
      options = options || {};
      if (!options.host && options.servername) {
        options.host = options.servername;
      }
      if (!options.host || node_net_1.default.isIP(options.host)) {
        const value = {
          addresses: [options.host]
        };
        return callback(null, formatDNSValue(value, {
          servername: options.servername || false,
          cached: false
        }));
      }
      const host = options.host;
      const servername = options.servername || host;
      let cached;
      if (exports2.dnsCache.has(options.host)) {
        cached = exports2.dnsCache.get(options.host);
        const now = Date.now();
        if (now - lastCacheCleanup > CACHE_CLEANUP_INTERVAL) {
          lastCacheCleanup = now;
          for (const [host2, entry] of exports2.dnsCache.entries()) {
            if (entry.expires && entry.expires < now) {
              exports2.dnsCache.delete(host2);
            }
          }
          if (exports2.dnsCache.size > MAX_CACHE_SIZE) {
            const toDelete = Math.floor(MAX_CACHE_SIZE * 0.1);
            const keys = Array.from(exports2.dnsCache.keys()).slice(0, toDelete);
            keys.forEach((key) => exports2.dnsCache.delete(key));
          }
        }
        if (!cached.expires || cached.expires >= now) {
          return callback(null, formatDNSValue(cached.value, {
            servername,
            cached: true
          }));
        }
      }
      let responded = false;
      let deadline;
      const respond = (err, result) => {
        if (responded) {
          return;
        }
        responded = true;
        clearTimeout(deadline);
        callback(err, result);
      };
      const respondCached = (error) => {
        if (!cached) {
          return false;
        }
        exports2.dnsCache.set(host, {
          value: cached.value,
          expires: Date.now() + (options.dnsTtl || DNS_TTL)
        });
        respond(null, formatDNSValue(cached.value, {
          servername,
          cached: true,
          error
        }));
        return true;
      };
      const resolvers = [];
      const timeout = Number(options.timeout) || 0;
      if (timeout > 0) {
        deadline = setTimeout(() => {
          for (const resolver of resolvers) {
            if (typeof resolver.cancel === "function") {
              resolver.cancel();
            }
          }
          const err = new Error("DNS lookup for " + host + " timed out");
          err.code = node_dns_1.default.TIMEOUT;
          if (!respondCached(err)) {
            respond(err);
          }
        }, timeout);
      }
      let ipv4Addresses = [];
      let ipv6Addresses = [];
      let ipv4Error = null;
      let ipv6Error = null;
      let pending = 2;
      const onResolved = () => {
        if (--pending || responded) {
          return;
        }
        const allAddresses = ipv4Addresses.concat(ipv6Addresses);
        if (allAddresses.length) {
          const value = {
            addresses: allAddresses
          };
          exports2.dnsCache.set(host, {
            value,
            expires: Date.now() + (options.dnsTtl || DNS_TTL)
          });
          return respond(null, formatDNSValue(value, {
            servername,
            cached: false
          }));
        }
        if (ipv4Error && ipv6Error && respondCached(ipv4Error)) {
          return;
        }
        try {
          node_dns_1.default.lookup(host, { all: true }, (err, addresses) => {
            if (err) {
              if (respondCached(err)) {
                return;
              }
              return respond(err);
            }
            const supportedAddresses = addresses ? addresses.filter((addr) => isFamilySupported(addr.family)).map((addr) => addr.address) : [];
            if (addresses && addresses.length && !supportedAddresses.length) {
              console.warn(`Failed to resolve IPv${addresses[0].family} addresses with current network`);
            }
            if (!supportedAddresses.length && cached) {
              return respond(null, formatDNSValue(cached.value, {
                servername,
                cached: true
              }));
            }
            const value = {
              addresses: supportedAddresses.length ? supportedAddresses : [host]
            };
            exports2.dnsCache.set(host, {
              value,
              expires: Date.now() + (options.dnsTtl || DNS_TTL)
            });
            return respond(null, formatDNSValue(value, {
              servername,
              cached: false
            }));
          });
        } catch (lookupErr) {
          if (respondCached(lookupErr)) {
            return;
          }
          return respond(ipv4Error || ipv6Error || lookupErr);
        }
      };
      for (const family of [4, 6]) {
        const resolver = resolve(family, host, options, (err, addresses) => {
          if (family === 4) {
            ipv4Error = err;
            ipv4Addresses = addresses || [];
          } else {
            ipv6Error = err;
            ipv6Addresses = addresses || [];
          }
          onResolved();
        });
        if (resolver) {
          resolvers.push(resolver);
        }
      }
    };
    exports2.resolveHostname = resolveHostname;
    var parseConnectionUrl = (str2) => {
      str2 = str2 || "";
      const options = {};
      const url = urllib.parse(str2, true);
      switch (url.protocol) {
        case "smtp:":
          options.secure = false;
          break;
        case "smtps:":
          options.secure = true;
          break;
        case "direct:":
          options.direct = true;
          break;
      }
      if (!isNaN(url.port) && Number(url.port)) {
        options.port = Number(url.port);
      }
      if (url.hostname) {
        options.host = url.hostname;
      }
      if (url.username || url.password) {
        options.auth = {
          user: url.username || "",
          pass: url.password || ""
        };
      }
      Object.keys(url.query || {}).forEach((key) => {
        let obj = options;
        let lKey = key;
        let value = url.query[key];
        if (!isNaN(value)) {
          value = Number(value);
        }
        switch (value) {
          case "true":
            value = true;
            break;
          case "false":
            value = false;
            break;
        }
        if (key.indexOf("tls.") === 0) {
          lKey = key.substr(4);
          if (!options.tls) {
            options.tls = {};
          }
          obj = options.tls;
        } else if (key.indexOf(".") >= 0) {
          return;
        }
        if (!(0, objects_js_1.isProtoKey)(lKey) && !(lKey in obj)) {
          obj[lKey] = value;
        }
      });
      return options;
    };
    exports2.parseConnectionUrl = parseConnectionUrl;
    var _logFunc = (logger, level, defaults, data, message, ...args) => {
      const entry = Object.assign({}, defaults || {}, data || {});
      delete entry.level;
      let logLevel = level;
      if (typeof logger[logLevel] !== "function") {
        logLevel = ["info", "debug", "log", "trace", "warn", "error"].find((name) => typeof logger[name] === "function");
      }
      if (logLevel) {
        logger[logLevel](entry, message, ...args);
      }
    };
    exports2._logFunc = _logFunc;
    var getLogger = (options, defaults) => {
      options = options || {};
      const response = {};
      const levels = ["trace", "debug", "info", "warn", "error", "fatal"];
      if (!options.logger) {
        levels.forEach((level) => {
          response[level] = () => false;
        });
        return response;
      }
      const logger = options.logger === true ? createDefaultLogger(levels) : options.logger;
      levels.forEach((level) => {
        response[level] = (...args) => {
          const data = typeof args[0] === "string" ? void 0 : args.shift();
          (0, exports2._logFunc)(logger, level, defaults, data, ...args);
        };
      });
      return response;
    };
    exports2.getLogger = getLogger;
    var callbackPromise = (resolve2, reject) => function(...args) {
      const err = args.shift();
      if (err) {
        reject(err);
      } else {
        resolve2(...args);
      }
    };
    exports2.callbackPromise = callbackPromise;
    var parseDataURI = (uri) => {
      if (typeof uri !== "string") {
        return null;
      }
      if (!uri.startsWith("data:")) {
        return null;
      }
      const commaPos = uri.indexOf(",");
      if (commaPos === -1) {
        return null;
      }
      const data = uri.substring(commaPos + 1);
      const metaStr = uri.substring("data:".length, commaPos);
      let encoding;
      const metaEntries = metaStr.split(";");
      if (metaEntries.length > 0) {
        const lastEntry = metaEntries[metaEntries.length - 1].toLowerCase().trim();
        if (["base64", "utf8", "utf-8"].includes(lastEntry) && lastEntry.indexOf("=") === -1) {
          encoding = lastEntry;
          metaEntries.pop();
        }
      }
      const contentType = metaEntries.length > 0 ? metaEntries.shift() : "application/octet-stream";
      const params = {};
      for (let i = 0; i < metaEntries.length; i++) {
        const entry = metaEntries[i];
        const sepPos = entry.indexOf("=");
        if (sepPos > 0) {
          const key = entry.substring(0, sepPos).trim();
          const value = entry.substring(sepPos + 1).trim();
          if (key && !(0, objects_js_1.isProtoKey)(key)) {
            params[key] = value;
          }
        }
      }
      let bufferData;
      try {
        if (encoding === "base64") {
          bufferData = Buffer.from(data, "base64");
        } else {
          try {
            bufferData = Buffer.from(decodeURIComponent(data));
          } catch (_decodeError) {
            bufferData = Buffer.from(data);
          }
        }
      } catch (_bufferError) {
        bufferData = Buffer.alloc(0);
      }
      return {
        data: bufferData,
        encoding: encoding || null,
        contentType: contentType || "application/octet-stream",
        params
      };
    };
    exports2.parseDataURI = parseDataURI;
    function resolveContent(data, key, options, callback) {
      if (!callback && typeof options === "function") {
        callback = options;
        options = false;
      }
      options = options || {};
      let promise;
      if (!callback) {
        promise = new Promise((resolve2, reject) => {
          callback = (0, exports2.callbackPromise)(resolve2, reject);
        });
      }
      resolveContentValue(data, key, options, callback);
      return promise;
    }
    function resolveContentValue(data, key, options, callback) {
      let content = data && data[key] && data[key].content || data[key];
      const encoding = (typeof data[key] === "object" && data[key].encoding || "utf8").toString().toLowerCase().replace(/[-_\s]/g, "");
      if (!content) {
        return callback(null, content);
      }
      if (typeof content === "object") {
        if (typeof content.pipe === "function") {
          return resolveStream(content, (err, value) => {
            if (err) {
              return callback(err);
            }
            if (data[key].content) {
              data[key].content = value;
            } else {
              data[key] = value;
            }
            callback(null, value);
          });
        } else if (/^data:/i.test(content.path || content.href)) {
          const parsedDataUri = (0, exports2.parseDataURI)(content.path || content.href);
          return callback(null, parsedDataUri && parsedDataUri.data ? parsedDataUri.data : Buffer.alloc(0));
        } else if (content.href || /^https?:\/\//i.test(content.path)) {
          const url = content.href || content.path;
          if (options.disableUrlAccess) {
            setImmediate(() => {
              const err = new Error("Url access rejected for " + url);
              err.code = errors.EURLACCESS;
              callback(err);
            });
            return;
          }
          return resolveStream((0, index_js_1.default)(url, { headers: content.httpHeaders, tls: content.tls }), callback);
        } else if (content.path) {
          if (options.disableFileAccess) {
            setImmediate(() => {
              const err = new Error("File access rejected for " + content.path);
              err.code = errors.EFILEACCESS;
              callback(err);
            });
            return;
          }
          return resolveStream(node_fs_1.default.createReadStream(content.path), callback);
        }
      }
      if (typeof data[key].content === "string" && !["utf8", "usascii", "ascii"].includes(encoding)) {
        content = Buffer.from(data[key].content, encoding);
      }
      setImmediate(() => callback(null, content));
    }
    var assign = function(...args) {
      const target = args.shift() || {};
      args.forEach((source) => {
        Object.keys(source || {}).forEach((key) => {
          if ((0, objects_js_1.isProtoKey)(key)) {
            return;
          }
          if (["tls", "auth"].includes(key) && source[key] && typeof source[key] === "object") {
            target[key] = (0, objects_js_1.copyOwnKeys)(target[key] || {}, source[key]);
          } else {
            target[key] = source[key];
          }
        });
      });
      return target;
    };
    exports2.assign = assign;
    var encodeXText = (str2) => {
      if (!/[^\x21-\x2A\x2C-\x3C\x3E-\x7E]/.test(str2)) {
        return str2;
      }
      const buf = Buffer.from(str2);
      let result = "";
      for (let i = 0, len = buf.length; i < len; i++) {
        const c = buf[i];
        if (c < 33 || c > 126 || c === 43 || c === 61) {
          result += "+" + (c < 16 ? "0" : "") + c.toString(16).toUpperCase();
        } else {
          result += String.fromCharCode(c);
        }
      }
      return result;
    };
    exports2.encodeXText = encodeXText;
    var streamErrors = /* @__PURE__ */ new WeakMap();
    function recordStreamErrors(stream) {
      stream.on("error", (err) => {
        if (!streamErrors.has(stream)) {
          streamErrors.set(stream, err);
        }
      });
    }
    function destroyStream(value) {
      const stream = value;
      if (stream && typeof stream.pipe === "function" && typeof stream.destroy === "function" && !stream.destroyed) {
        stream.destroy();
      }
    }
    function unreadableStreamError(stream) {
      const err = streamErrors.get(stream) || stream.errored;
      if (err) {
        return err;
      }
      if (stream.readableEnded || stream.destroyed) {
        const unreadable = new Error("Content stream was already read or destroyed");
        unreadable.code = errors.ESTREAM;
        return unreadable;
      }
      return null;
    }
    function resolveStream(stream, callback) {
      let responded = false;
      const respond = (err, value) => {
        if (responded) {
          return;
        }
        responded = true;
        callback(err, value);
      };
      const unreadable = unreadableStreamError(stream);
      if (unreadable) {
        stream.on("error", () => false);
        setImmediate(() => respond(unreadable));
        return;
      }
      const chunks = [];
      let chunklen = 0;
      stream.on("data", (chunk) => {
        if (typeof chunk === "string") {
          chunk = Buffer.from(chunk);
        }
        chunks.push(chunk);
        chunklen += chunk.length;
      });
      (0, node_stream_1.finished)(stream, { writable: false }, (err) => {
        if (err) {
          return respond(err);
        }
        let value;
        try {
          value = Buffer.concat(chunks, chunklen);
        } catch (E) {
          return respond(E);
        }
        respond(null, value);
      });
    }
    function createDefaultLogger(levels) {
      const levelMaxLen = levels.reduce((max, level) => Math.max(max, level.length), 0);
      const levelNames = /* @__PURE__ */ new Map();
      levels.forEach((level) => {
        let levelName = level.toUpperCase();
        if (levelName.length < levelMaxLen) {
          levelName += " ".repeat(levelMaxLen - levelName.length);
        }
        levelNames.set(level, levelName);
      });
      const print = (level, entry, message, ...args) => {
        let prefix = "";
        if (entry) {
          if (entry.tnx === "server") {
            prefix = "S: ";
          } else if (entry.tnx === "client") {
            prefix = "C: ";
          }
          if (entry.sid) {
            prefix = "[" + entry.sid + "] " + prefix;
          }
          if (entry.cid) {
            prefix = "[#" + entry.cid + "] " + prefix;
          }
        }
        message = node_util_1.default.format(message, ...args);
        message.split(/\r?\n/).forEach((line) => {
          console.log("[%s] %s %s", (/* @__PURE__ */ new Date()).toISOString().substr(0, 19).replace(/T/, " "), levelNames.get(level), prefix + line);
        });
      };
      const logger = {};
      levels.forEach((level) => {
        logger[level] = print.bind(null, level);
      });
      return logger;
    }
  }
});

// node_modules/nodemailer/dist/cjs/mime-funcs/mime-types.js
var require_mime_types = __commonJS({
  "node_modules/nodemailer/dist/cjs/mime-funcs/mime-types.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.detectMimeType = detectMimeType;
    exports2.detectExtension = detectExtension;
    var node_path_1 = __importDefault(require("node:path"));
    var defaultMimeType = "application/octet-stream";
    var defaultExtension = "bin";
    var mimeTypes = /* @__PURE__ */ new Map([
      ["application/acad", "dwg"],
      ["application/applixware", "aw"],
      ["application/arj", "arj"],
      ["application/atom+xml", "xml"],
      ["application/atomcat+xml", "atomcat"],
      ["application/atomsvc+xml", "atomsvc"],
      ["application/base64", ["mm", "mme"]],
      ["application/binhex", "hqx"],
      ["application/binhex4", "hqx"],
      ["application/book", ["book", "boo"]],
      ["application/ccxml+xml,", "ccxml"],
      ["application/cdf", "cdf"],
      ["application/cdmi-capability", "cdmia"],
      ["application/cdmi-container", "cdmic"],
      ["application/cdmi-domain", "cdmid"],
      ["application/cdmi-object", "cdmio"],
      ["application/cdmi-queue", "cdmiq"],
      ["application/clariscad", "ccad"],
      ["application/commonground", "dp"],
      ["application/cu-seeme", "cu"],
      ["application/davmount+xml", "davmount"],
      ["application/drafting", "drw"],
      ["application/dsptype", "tsp"],
      ["application/dssc+der", "dssc"],
      ["application/dssc+xml", "xdssc"],
      ["application/dxf", "dxf"],
      ["application/ecmascript", ["js", "es"]],
      ["application/emma+xml", "emma"],
      ["application/envoy", "evy"],
      ["application/epub+zip", "epub"],
      ["application/excel", ["xls", "xl", "xla", "xlb", "xlc", "xld", "xlk", "xll", "xlm", "xlt", "xlv", "xlw"]],
      ["application/exi", "exi"],
      ["application/font-tdpfr", "pfr"],
      ["application/fractals", "fif"],
      ["application/freeloader", "frl"],
      ["application/futuresplash", "spl"],
      ["application/geo+json", "geojson"],
      ["application/gnutar", "tgz"],
      ["application/groupwise", "vew"],
      ["application/hlp", "hlp"],
      ["application/hta", "hta"],
      ["application/hyperstudio", "stk"],
      ["application/i-deas", "unv"],
      ["application/iges", ["iges", "igs"]],
      ["application/inf", "inf"],
      ["application/internet-property-stream", "acx"],
      ["application/ipfix", "ipfix"],
      ["application/java", "class"],
      ["application/java-archive", "jar"],
      ["application/java-byte-code", "class"],
      ["application/java-serialized-object", "ser"],
      ["application/java-vm", "class"],
      ["application/javascript", "js"],
      ["application/json", "json"],
      ["application/lha", "lha"],
      ["application/lzx", "lzx"],
      ["application/mac-binary", "bin"],
      ["application/mac-binhex", "hqx"],
      ["application/mac-binhex40", "hqx"],
      ["application/mac-compactpro", "cpt"],
      ["application/macbinary", "bin"],
      ["application/mads+xml", "mads"],
      ["application/marc", "mrc"],
      ["application/marcxml+xml", "mrcx"],
      ["application/mathematica", "ma"],
      ["application/mathml+xml", "mathml"],
      ["application/mbedlet", "mbd"],
      ["application/mbox", "mbox"],
      ["application/mcad", "mcd"],
      ["application/mediaservercontrol+xml", "mscml"],
      ["application/metalink4+xml", "meta4"],
      ["application/mets+xml", "mets"],
      ["application/mime", "aps"],
      ["application/mods+xml", "mods"],
      ["application/mp21", "m21"],
      ["application/mp4", "mp4"],
      ["application/mspowerpoint", ["ppt", "pot", "pps", "ppz"]],
      ["application/msword", ["doc", "dot", "w6w", "wiz", "word"]],
      ["application/mswrite", "wri"],
      ["application/mxf", "mxf"],
      ["application/netmc", "mcp"],
      ["application/octet-stream", ["*"]],
      ["application/oda", "oda"],
      ["application/oebps-package+xml", "opf"],
      ["application/ogg", "ogx"],
      ["application/olescript", "axs"],
      ["application/onenote", "onetoc"],
      ["application/patch-ops-error+xml", "xer"],
      ["application/pdf", "pdf"],
      ["application/pgp-encrypted", "asc"],
      ["application/pgp-signature", "pgp"],
      ["application/pics-rules", "prf"],
      ["application/pkcs-12", "p12"],
      ["application/pkcs-crl", "crl"],
      ["application/pkcs10", "p10"],
      ["application/pkcs7-mime", ["p7c", "p7m"]],
      ["application/pkcs7-signature", "p7s"],
      ["application/pkcs8", "p8"],
      ["application/pkix-attr-cert", "ac"],
      ["application/pkix-cert", ["cer", "crt"]],
      ["application/pkix-crl", "crl"],
      ["application/pkix-pkipath", "pkipath"],
      ["application/pkixcmp", "pki"],
      ["application/plain", "text"],
      ["application/pls+xml", "pls"],
      ["application/postscript", ["ps", "ai", "eps"]],
      ["application/powerpoint", "ppt"],
      ["application/pro_eng", ["part", "prt"]],
      ["application/prs.cww", "cww"],
      ["application/pskc+xml", "pskcxml"],
      ["application/rdf+xml", "rdf"],
      ["application/reginfo+xml", "rif"],
      ["application/relax-ng-compact-syntax", "rnc"],
      ["application/resource-lists+xml", "rl"],
      ["application/resource-lists-diff+xml", "rld"],
      ["application/ringing-tones", "rng"],
      ["application/rls-services+xml", "rs"],
      ["application/rsd+xml", "rsd"],
      ["application/rss+xml", "xml"],
      ["application/rtf", ["rtf", "rtx"]],
      ["application/sbml+xml", "sbml"],
      ["application/scvp-cv-request", "scq"],
      ["application/scvp-cv-response", "scs"],
      ["application/scvp-vp-request", "spq"],
      ["application/scvp-vp-response", "spp"],
      ["application/sdp", "sdp"],
      ["application/sea", "sea"],
      ["application/set", "set"],
      ["application/set-payment-initiation", "setpay"],
      ["application/set-registration-initiation", "setreg"],
      ["application/shf+xml", "shf"],
      ["application/sla", "stl"],
      ["application/smil", ["smi", "smil"]],
      ["application/smil+xml", "smi"],
      ["application/solids", "sol"],
      ["application/sounder", "sdr"],
      ["application/sparql-query", "rq"],
      ["application/sparql-results+xml", "srx"],
      ["application/srgs", "gram"],
      ["application/srgs+xml", "grxml"],
      ["application/sru+xml", "sru"],
      ["application/ssml+xml", "ssml"],
      ["application/step", ["step", "stp"]],
      ["application/streamingmedia", "ssm"],
      ["application/tei+xml", "tei"],
      ["application/thraud+xml", "tfi"],
      ["application/timestamped-data", "tsd"],
      ["application/toolbook", "tbk"],
      ["application/vda", "vda"],
      ["application/vnd.3gpp.pic-bw-large", "plb"],
      ["application/vnd.3gpp.pic-bw-small", "psb"],
      ["application/vnd.3gpp.pic-bw-var", "pvb"],
      ["application/vnd.3gpp2.tcap", "tcap"],
      ["application/vnd.3m.post-it-notes", "pwn"],
      ["application/vnd.accpac.simply.aso", "aso"],
      ["application/vnd.accpac.simply.imp", "imp"],
      ["application/vnd.acucobol", "acu"],
      ["application/vnd.acucorp", "atc"],
      ["application/vnd.adobe.air-application-installer-package+zip", "air"],
      ["application/vnd.adobe.fxp", "fxp"],
      ["application/vnd.adobe.xdp+xml", "xdp"],
      ["application/vnd.adobe.xfdf", "xfdf"],
      ["application/vnd.ahead.space", "ahead"],
      ["application/vnd.airzip.filesecure.azf", "azf"],
      ["application/vnd.airzip.filesecure.azs", "azs"],
      ["application/vnd.amazon.ebook", "azw"],
      ["application/vnd.americandynamics.acc", "acc"],
      ["application/vnd.amiga.ami", "ami"],
      ["application/vnd.android.package-archive", "apk"],
      ["application/vnd.anser-web-certificate-issue-initiation", "cii"],
      ["application/vnd.anser-web-funds-transfer-initiation", "fti"],
      ["application/vnd.antix.game-component", "atx"],
      ["application/vnd.apple.installer+xml", "mpkg"],
      ["application/vnd.apple.mpegurl", "m3u8"],
      ["application/vnd.aristanetworks.swi", "swi"],
      ["application/vnd.audiograph", "aep"],
      ["application/vnd.blueice.multipass", "mpm"],
      ["application/vnd.bmi", "bmi"],
      ["application/vnd.businessobjects", "rep"],
      ["application/vnd.chemdraw+xml", "cdxml"],
      ["application/vnd.chipnuts.karaoke-mmd", "mmd"],
      ["application/vnd.cinderella", "cdy"],
      ["application/vnd.claymore", "cla"],
      ["application/vnd.cloanto.rp9", "rp9"],
      ["application/vnd.clonk.c4group", "c4g"],
      ["application/vnd.cluetrust.cartomobile-config", "c11amc"],
      ["application/vnd.cluetrust.cartomobile-config-pkg", "c11amz"],
      ["application/vnd.commonspace", "csp"],
      ["application/vnd.contact.cmsg", "cdbcmsg"],
      ["application/vnd.cosmocaller", "cmc"],
      ["application/vnd.crick.clicker", "clkx"],
      ["application/vnd.crick.clicker.keyboard", "clkk"],
      ["application/vnd.crick.clicker.palette", "clkp"],
      ["application/vnd.crick.clicker.template", "clkt"],
      ["application/vnd.crick.clicker.wordbank", "clkw"],
      ["application/vnd.criticaltools.wbs+xml", "wbs"],
      ["application/vnd.ctc-posml", "pml"],
      ["application/vnd.cups-ppd", "ppd"],
      ["application/vnd.curl.car", "car"],
      ["application/vnd.curl.pcurl", "pcurl"],
      ["application/vnd.data-vision.rdz", "rdz"],
      ["application/vnd.denovo.fcselayout-link", "fe_launch"],
      ["application/vnd.dna", "dna"],
      ["application/vnd.dolby.mlp", "mlp"],
      ["application/vnd.dpgraph", "dpg"],
      ["application/vnd.dreamfactory", "dfac"],
      ["application/vnd.dvb.ait", "ait"],
      ["application/vnd.dvb.service", "svc"],
      ["application/vnd.dynageo", "geo"],
      ["application/vnd.ecowin.chart", "mag"],
      ["application/vnd.enliven", "nml"],
      ["application/vnd.epson.esf", "esf"],
      ["application/vnd.epson.msf", "msf"],
      ["application/vnd.epson.quickanime", "qam"],
      ["application/vnd.epson.salt", "slt"],
      ["application/vnd.epson.ssf", "ssf"],
      ["application/vnd.eszigno3+xml", "es3"],
      ["application/vnd.ezpix-album", "ez2"],
      ["application/vnd.ezpix-package", "ez3"],
      ["application/vnd.fdf", "fdf"],
      ["application/vnd.fdsn.seed", "seed"],
      ["application/vnd.flographit", "gph"],
      ["application/vnd.fluxtime.clip", "ftc"],
      ["application/vnd.framemaker", "fm"],
      ["application/vnd.frogans.fnc", "fnc"],
      ["application/vnd.frogans.ltf", "ltf"],
      ["application/vnd.fsc.weblaunch", "fsc"],
      ["application/vnd.fujitsu.oasys", "oas"],
      ["application/vnd.fujitsu.oasys2", "oa2"],
      ["application/vnd.fujitsu.oasys3", "oa3"],
      ["application/vnd.fujitsu.oasysgp", "fg5"],
      ["application/vnd.fujitsu.oasysprs", "bh2"],
      ["application/vnd.fujixerox.ddd", "ddd"],
      ["application/vnd.fujixerox.docuworks", "xdw"],
      ["application/vnd.fujixerox.docuworks.binder", "xbd"],
      ["application/vnd.fuzzysheet", "fzs"],
      ["application/vnd.genomatix.tuxedo", "txd"],
      ["application/vnd.geogebra.file", "ggb"],
      ["application/vnd.geogebra.tool", "ggt"],
      ["application/vnd.geometry-explorer", "gex"],
      ["application/vnd.geonext", "gxt"],
      ["application/vnd.geoplan", "g2w"],
      ["application/vnd.geospace", "g3w"],
      ["application/vnd.gmx", "gmx"],
      ["application/vnd.google-earth.kml+xml", "kml"],
      ["application/vnd.google-earth.kmz", "kmz"],
      ["application/vnd.grafeq", "gqf"],
      ["application/vnd.groove-account", "gac"],
      ["application/vnd.groove-help", "ghf"],
      ["application/vnd.groove-identity-message", "gim"],
      ["application/vnd.groove-injector", "grv"],
      ["application/vnd.groove-tool-message", "gtm"],
      ["application/vnd.groove-tool-template", "tpl"],
      ["application/vnd.groove-vcard", "vcg"],
      ["application/vnd.hal+xml", "hal"],
      ["application/vnd.handheld-entertainment+xml", "zmm"],
      ["application/vnd.hbci", "hbci"],
      ["application/vnd.hhe.lesson-player", "les"],
      ["application/vnd.hp-hpgl", ["hgl", "hpg", "hpgl"]],
      ["application/vnd.hp-hpid", "hpid"],
      ["application/vnd.hp-hps", "hps"],
      ["application/vnd.hp-jlyt", "jlt"],
      ["application/vnd.hp-pcl", "pcl"],
      ["application/vnd.hp-pclxl", "pclxl"],
      ["application/vnd.hydrostatix.sof-data", "sfd-hdstx"],
      ["application/vnd.hzn-3d-crossword", "x3d"],
      ["application/vnd.ibm.minipay", "mpy"],
      ["application/vnd.ibm.modcap", "afp"],
      ["application/vnd.ibm.rights-management", "irm"],
      ["application/vnd.ibm.secure-container", "sc"],
      ["application/vnd.iccprofile", "icc"],
      ["application/vnd.igloader", "igl"],
      ["application/vnd.immervision-ivp", "ivp"],
      ["application/vnd.immervision-ivu", "ivu"],
      ["application/vnd.insors.igm", "igm"],
      ["application/vnd.intercon.formnet", "xpw"],
      ["application/vnd.intergeo", "i2g"],
      ["application/vnd.intu.qbo", "qbo"],
      ["application/vnd.intu.qfx", "qfx"],
      ["application/vnd.ipunplugged.rcprofile", "rcprofile"],
      ["application/vnd.irepository.package+xml", "irp"],
      ["application/vnd.is-xpr", "xpr"],
      ["application/vnd.isac.fcs", "fcs"],
      ["application/vnd.jam", "jam"],
      ["application/vnd.jcp.javame.midlet-rms", "rms"],
      ["application/vnd.jisp", "jisp"],
      ["application/vnd.joost.joda-archive", "joda"],
      ["application/vnd.kahootz", "ktz"],
      ["application/vnd.kde.karbon", "karbon"],
      ["application/vnd.kde.kchart", "chrt"],
      ["application/vnd.kde.kformula", "kfo"],
      ["application/vnd.kde.kivio", "flw"],
      ["application/vnd.kde.kontour", "kon"],
      ["application/vnd.kde.kpresenter", "kpr"],
      ["application/vnd.kde.kspread", "ksp"],
      ["application/vnd.kde.kword", "kwd"],
      ["application/vnd.kenameaapp", "htke"],
      ["application/vnd.kidspiration", "kia"],
      ["application/vnd.kinar", "kne"],
      ["application/vnd.koan", "skp"],
      ["application/vnd.kodak-descriptor", "sse"],
      ["application/vnd.las.las+xml", "lasxml"],
      ["application/vnd.llamagraphics.life-balance.desktop", "lbd"],
      ["application/vnd.llamagraphics.life-balance.exchange+xml", "lbe"],
      ["application/vnd.lotus-1-2-3", "123"],
      ["application/vnd.lotus-approach", "apr"],
      ["application/vnd.lotus-freelance", "pre"],
      ["application/vnd.lotus-notes", "nsf"],
      ["application/vnd.lotus-organizer", "org"],
      ["application/vnd.lotus-screencam", "scm"],
      ["application/vnd.lotus-wordpro", "lwp"],
      ["application/vnd.macports.portpkg", "portpkg"],
      ["application/vnd.mcd", "mcd"],
      ["application/vnd.medcalcdata", "mc1"],
      ["application/vnd.mediastation.cdkey", "cdkey"],
      ["application/vnd.mfer", "mwf"],
      ["application/vnd.mfmp", "mfm"],
      ["application/vnd.micrografx.flo", "flo"],
      ["application/vnd.micrografx.igx", "igx"],
      ["application/vnd.mif", "mif"],
      ["application/vnd.mobius.daf", "daf"],
      ["application/vnd.mobius.dis", "dis"],
      ["application/vnd.mobius.mbk", "mbk"],
      ["application/vnd.mobius.mqy", "mqy"],
      ["application/vnd.mobius.msl", "msl"],
      ["application/vnd.mobius.plc", "plc"],
      ["application/vnd.mobius.txf", "txf"],
      ["application/vnd.mophun.application", "mpn"],
      ["application/vnd.mophun.certificate", "mpc"],
      ["application/vnd.mozilla.xul+xml", "xul"],
      ["application/vnd.ms-artgalry", "cil"],
      ["application/vnd.ms-cab-compressed", "cab"],
      ["application/vnd.ms-excel", ["xls", "xla", "xlc", "xlm", "xlt", "xlw", "xlb", "xll"]],
      ["application/vnd.ms-excel.addin.macroenabled.12", "xlam"],
      ["application/vnd.ms-excel.sheet.binary.macroenabled.12", "xlsb"],
      ["application/vnd.ms-excel.sheet.macroenabled.12", "xlsm"],
      ["application/vnd.ms-excel.template.macroenabled.12", "xltm"],
      ["application/vnd.ms-fontobject", "eot"],
      ["application/vnd.ms-htmlhelp", "chm"],
      ["application/vnd.ms-ims", "ims"],
      ["application/vnd.ms-lrm", "lrm"],
      ["application/vnd.ms-officetheme", "thmx"],
      ["application/vnd.ms-outlook", "msg"],
      ["application/vnd.ms-pki.certstore", "sst"],
      ["application/vnd.ms-pki.pko", "pko"],
      ["application/vnd.ms-pki.seccat", "cat"],
      ["application/vnd.ms-pki.stl", "stl"],
      ["application/vnd.ms-pkicertstore", "sst"],
      ["application/vnd.ms-pkiseccat", "cat"],
      ["application/vnd.ms-pkistl", "stl"],
      ["application/vnd.ms-powerpoint", ["ppt", "pot", "pps", "ppa", "pwz"]],
      ["application/vnd.ms-powerpoint.addin.macroenabled.12", "ppam"],
      ["application/vnd.ms-powerpoint.presentation.macroenabled.12", "pptm"],
      ["application/vnd.ms-powerpoint.slide.macroenabled.12", "sldm"],
      ["application/vnd.ms-powerpoint.slideshow.macroenabled.12", "ppsm"],
      ["application/vnd.ms-powerpoint.template.macroenabled.12", "potm"],
      ["application/vnd.ms-project", "mpp"],
      ["application/vnd.ms-word.document.macroenabled.12", "docm"],
      ["application/vnd.ms-word.template.macroenabled.12", "dotm"],
      ["application/vnd.ms-works", ["wks", "wcm", "wdb", "wps"]],
      ["application/vnd.ms-wpl", "wpl"],
      ["application/vnd.ms-xpsdocument", "xps"],
      ["application/vnd.mseq", "mseq"],
      ["application/vnd.musician", "mus"],
      ["application/vnd.muvee.style", "msty"],
      ["application/vnd.neurolanguage.nlu", "nlu"],
      ["application/vnd.noblenet-directory", "nnd"],
      ["application/vnd.noblenet-sealer", "nns"],
      ["application/vnd.noblenet-web", "nnw"],
      ["application/vnd.nokia.configuration-message", "ncm"],
      ["application/vnd.nokia.n-gage.data", "ngdat"],
      ["application/vnd.nokia.n-gage.symbian.install", "n-gage"],
      ["application/vnd.nokia.radio-preset", "rpst"],
      ["application/vnd.nokia.radio-presets", "rpss"],
      ["application/vnd.nokia.ringing-tone", "rng"],
      ["application/vnd.novadigm.edm", "edm"],
      ["application/vnd.novadigm.edx", "edx"],
      ["application/vnd.novadigm.ext", "ext"],
      ["application/vnd.oasis.opendocument.chart", "odc"],
      ["application/vnd.oasis.opendocument.chart-template", "otc"],
      ["application/vnd.oasis.opendocument.database", "odb"],
      ["application/vnd.oasis.opendocument.formula", "odf"],
      ["application/vnd.oasis.opendocument.formula-template", "odft"],
      ["application/vnd.oasis.opendocument.graphics", "odg"],
      ["application/vnd.oasis.opendocument.graphics-template", "otg"],
      ["application/vnd.oasis.opendocument.image", "odi"],
      ["application/vnd.oasis.opendocument.image-template", "oti"],
      ["application/vnd.oasis.opendocument.presentation", "odp"],
      ["application/vnd.oasis.opendocument.presentation-template", "otp"],
      ["application/vnd.oasis.opendocument.spreadsheet", "ods"],
      ["application/vnd.oasis.opendocument.spreadsheet-template", "ots"],
      ["application/vnd.oasis.opendocument.text", "odt"],
      ["application/vnd.oasis.opendocument.text-master", "odm"],
      ["application/vnd.oasis.opendocument.text-template", "ott"],
      ["application/vnd.oasis.opendocument.text-web", "oth"],
      ["application/vnd.olpc-sugar", "xo"],
      ["application/vnd.oma.dd2+xml", "dd2"],
      ["application/vnd.openofficeorg.extension", "oxt"],
      ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
      ["application/vnd.openxmlformats-officedocument.presentationml.slide", "sldx"],
      ["application/vnd.openxmlformats-officedocument.presentationml.slideshow", "ppsx"],
      ["application/vnd.openxmlformats-officedocument.presentationml.template", "potx"],
      ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
      ["application/vnd.openxmlformats-officedocument.spreadsheetml.template", "xltx"],
      ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
      ["application/vnd.openxmlformats-officedocument.wordprocessingml.template", "dotx"],
      ["application/vnd.osgeo.mapguide.package", "mgp"],
      ["application/vnd.osgi.dp", "dp"],
      ["application/vnd.palm", "pdb"],
      ["application/vnd.pawaafile", "paw"],
      ["application/vnd.pg.format", "str"],
      ["application/vnd.pg.osasli", "ei6"],
      ["application/vnd.picsel", "efif"],
      ["application/vnd.pmi.widget", "wg"],
      ["application/vnd.pocketlearn", "plf"],
      ["application/vnd.powerbuilder6", "pbd"],
      ["application/vnd.previewsystems.box", "box"],
      ["application/vnd.proteus.magazine", "mgz"],
      ["application/vnd.publishare-delta-tree", "qps"],
      ["application/vnd.pvi.ptid1", "ptid"],
      ["application/vnd.quark.quarkxpress", "qxd"],
      ["application/vnd.realvnc.bed", "bed"],
      ["application/vnd.recordare.musicxml", "mxl"],
      ["application/vnd.recordare.musicxml+xml", "musicxml"],
      ["application/vnd.rig.cryptonote", "cryptonote"],
      ["application/vnd.rim.cod", "cod"],
      ["application/vnd.rn-realmedia", "rm"],
      ["application/vnd.rn-realplayer", "rnx"],
      ["application/vnd.route66.link66+xml", "link66"],
      ["application/vnd.sailingtracker.track", "st"],
      ["application/vnd.seemail", "see"],
      ["application/vnd.sema", "sema"],
      ["application/vnd.semd", "semd"],
      ["application/vnd.semf", "semf"],
      ["application/vnd.shana.informed.formdata", "ifm"],
      ["application/vnd.shana.informed.formtemplate", "itp"],
      ["application/vnd.shana.informed.interchange", "iif"],
      ["application/vnd.shana.informed.package", "ipk"],
      ["application/vnd.simtech-mindmapper", "twd"],
      ["application/vnd.smaf", "mmf"],
      ["application/vnd.smart.teacher", "teacher"],
      ["application/vnd.solent.sdkm+xml", "sdkm"],
      ["application/vnd.spotfire.dxp", "dxp"],
      ["application/vnd.spotfire.sfs", "sfs"],
      ["application/vnd.stardivision.calc", "sdc"],
      ["application/vnd.stardivision.draw", "sda"],
      ["application/vnd.stardivision.impress", "sdd"],
      ["application/vnd.stardivision.math", "smf"],
      ["application/vnd.stardivision.writer", "sdw"],
      ["application/vnd.stardivision.writer-global", "sgl"],
      ["application/vnd.stepmania.stepchart", "sm"],
      ["application/vnd.sun.xml.calc", "sxc"],
      ["application/vnd.sun.xml.calc.template", "stc"],
      ["application/vnd.sun.xml.draw", "sxd"],
      ["application/vnd.sun.xml.draw.template", "std"],
      ["application/vnd.sun.xml.impress", "sxi"],
      ["application/vnd.sun.xml.impress.template", "sti"],
      ["application/vnd.sun.xml.math", "sxm"],
      ["application/vnd.sun.xml.writer", "sxw"],
      ["application/vnd.sun.xml.writer.global", "sxg"],
      ["application/vnd.sun.xml.writer.template", "stw"],
      ["application/vnd.sus-calendar", "sus"],
      ["application/vnd.svd", "svd"],
      ["application/vnd.symbian.install", "sis"],
      ["application/vnd.syncml+xml", "xsm"],
      ["application/vnd.syncml.dm+wbxml", "bdm"],
      ["application/vnd.syncml.dm+xml", "xdm"],
      ["application/vnd.tao.intent-module-archive", "tao"],
      ["application/vnd.tmobile-livetv", "tmo"],
      ["application/vnd.trid.tpt", "tpt"],
      ["application/vnd.triscape.mxs", "mxs"],
      ["application/vnd.trueapp", "tra"],
      ["application/vnd.ufdl", "ufd"],
      ["application/vnd.uiq.theme", "utz"],
      ["application/vnd.umajin", "umj"],
      ["application/vnd.unity", "unityweb"],
      ["application/vnd.uoml+xml", "uoml"],
      ["application/vnd.vcx", "vcx"],
      ["application/vnd.visio", "vsd"],
      ["application/vnd.visionary", "vis"],
      ["application/vnd.vsf", "vsf"],
      ["application/vnd.wap.wbxml", "wbxml"],
      ["application/vnd.wap.wmlc", "wmlc"],
      ["application/vnd.wap.wmlscriptc", "wmlsc"],
      ["application/vnd.webturbo", "wtb"],
      ["application/vnd.wolfram.player", "nbp"],
      ["application/vnd.wordperfect", "wpd"],
      ["application/vnd.wqd", "wqd"],
      ["application/vnd.wt.stf", "stf"],
      ["application/vnd.xara", ["web", "xar"]],
      ["application/vnd.xfdl", "xfdl"],
      ["application/vnd.yamaha.hv-dic", "hvd"],
      ["application/vnd.yamaha.hv-script", "hvs"],
      ["application/vnd.yamaha.hv-voice", "hvp"],
      ["application/vnd.yamaha.openscoreformat", "osf"],
      ["application/vnd.yamaha.openscoreformat.osfpvg+xml", "osfpvg"],
      ["application/vnd.yamaha.smaf-audio", "saf"],
      ["application/vnd.yamaha.smaf-phrase", "spf"],
      ["application/vnd.yellowriver-custom-menu", "cmp"],
      ["application/vnd.zul", "zir"],
      ["application/vnd.zzazz.deck+xml", "zaz"],
      ["application/vocaltec-media-desc", "vmd"],
      ["application/vocaltec-media-file", "vmf"],
      ["application/voicexml+xml", "vxml"],
      ["application/widget", "wgt"],
      ["application/winhlp", "hlp"],
      ["application/wordperfect", ["wp", "wp5", "wp6", "wpd"]],
      ["application/wordperfect6.0", ["w60", "wp5"]],
      ["application/wordperfect6.1", "w61"],
      ["application/wsdl+xml", "wsdl"],
      ["application/wspolicy+xml", "wspolicy"],
      ["application/x-123", "wk1"],
      ["application/x-7z-compressed", "7z"],
      ["application/x-abiword", "abw"],
      ["application/x-ace-compressed", "ace"],
      ["application/x-aim", "aim"],
      ["application/x-authorware-bin", "aab"],
      ["application/x-authorware-map", "aam"],
      ["application/x-authorware-seg", "aas"],
      ["application/x-bcpio", "bcpio"],
      ["application/x-binary", "bin"],
      ["application/x-binhex40", "hqx"],
      ["application/x-bittorrent", "torrent"],
      ["application/x-bsh", ["bsh", "sh", "shar"]],
      ["application/x-bytecode.elisp", "elc"],
      ["application/x-bytecode.python", "pyc"],
      ["application/x-bzip", "bz"],
      ["application/x-bzip2", ["boz", "bz2"]],
      ["application/x-cdf", "cdf"],
      ["application/x-cdlink", "vcd"],
      ["application/x-chat", ["cha", "chat"]],
      ["application/x-chess-pgn", "pgn"],
      ["application/x-cmu-raster", "ras"],
      ["application/x-cocoa", "cco"],
      ["application/x-compactpro", "cpt"],
      ["application/x-compress", "z"],
      ["application/x-compressed", ["tgz", "gz", "z", "zip"]],
      ["application/x-conference", "nsc"],
      ["application/x-cpio", "cpio"],
      ["application/x-cpt", "cpt"],
      ["application/x-csh", "csh"],
      ["application/x-debian-package", "deb"],
      ["application/x-deepv", "deepv"],
      ["application/x-director", ["dir", "dcr", "dxr"]],
      ["application/x-doom", "wad"],
      ["application/x-dtbncx+xml", "ncx"],
      ["application/x-dtbook+xml", "dtb"],
      ["application/x-dtbresource+xml", "res"],
      ["application/x-dvi", "dvi"],
      ["application/x-elc", "elc"],
      ["application/x-envoy", ["env", "evy"]],
      ["application/x-esrehber", "es"],
      ["application/x-excel", ["xls", "xla", "xlb", "xlc", "xld", "xlk", "xll", "xlm", "xlt", "xlv", "xlw"]],
      ["application/x-font-bdf", "bdf"],
      ["application/x-font-ghostscript", "gsf"],
      ["application/x-font-linux-psf", "psf"],
      ["application/x-font-otf", "otf"],
      ["application/x-font-pcf", "pcf"],
      ["application/x-font-snf", "snf"],
      ["application/x-font-ttf", "ttf"],
      ["application/x-font-type1", "pfa"],
      ["application/x-font-woff", "woff"],
      ["application/x-frame", "mif"],
      ["application/x-freelance", "pre"],
      ["application/x-futuresplash", "spl"],
      ["application/x-gnumeric", "gnumeric"],
      ["application/x-gsp", "gsp"],
      ["application/x-gss", "gss"],
      ["application/x-gtar", "gtar"],
      ["application/x-gzip", ["gz", "gzip"]],
      ["application/x-hdf", "hdf"],
      ["application/x-helpfile", ["help", "hlp"]],
      ["application/x-httpd-imap", "imap"],
      ["application/x-ima", "ima"],
      ["application/x-internet-signup", ["ins", "isp"]],
      ["application/x-internett-signup", "ins"],
      ["application/x-inventor", "iv"],
      ["application/x-ip2", "ip"],
      ["application/x-iphone", "iii"],
      ["application/x-java-class", "class"],
      ["application/x-java-commerce", "jcm"],
      ["application/x-java-jnlp-file", "jnlp"],
      ["application/x-javascript", "js"],
      ["application/x-koan", ["skd", "skm", "skp", "skt"]],
      ["application/x-ksh", "ksh"],
      ["application/x-latex", ["latex", "ltx"]],
      ["application/x-lha", "lha"],
      ["application/x-lisp", "lsp"],
      ["application/x-livescreen", "ivy"],
      ["application/x-lotus", "wq1"],
      ["application/x-lotusscreencam", "scm"],
      ["application/x-lzh", "lzh"],
      ["application/x-lzx", "lzx"],
      ["application/x-mac-binhex40", "hqx"],
      ["application/x-macbinary", "bin"],
      ["application/x-magic-cap-package-1.0", "mc$"],
      ["application/x-mathcad", "mcd"],
      ["application/x-meme", "mm"],
      ["application/x-midi", ["mid", "midi"]],
      ["application/x-mif", "mif"],
      ["application/x-mix-transfer", "nix"],
      ["application/x-mobipocket-ebook", "prc"],
      ["application/x-mplayer2", "asx"],
      ["application/x-ms-application", "application"],
      ["application/x-ms-wmd", "wmd"],
      ["application/x-ms-wmz", "wmz"],
      ["application/x-ms-xbap", "xbap"],
      ["application/x-msaccess", "mdb"],
      ["application/x-msbinder", "obd"],
      ["application/x-mscardfile", "crd"],
      ["application/x-msclip", "clp"],
      ["application/x-msdownload", ["exe", "dll"]],
      ["application/x-msexcel", ["xls", "xla", "xlw"]],
      ["application/x-msmediaview", ["mvb", "m13", "m14"]],
      ["application/x-msmetafile", "wmf"],
      ["application/x-msmoney", "mny"],
      ["application/x-mspowerpoint", "ppt"],
      ["application/x-mspublisher", "pub"],
      ["application/x-msschedule", "scd"],
      ["application/x-msterminal", "trm"],
      ["application/x-mswrite", "wri"],
      ["application/x-navi-animation", "ani"],
      ["application/x-navidoc", "nvd"],
      ["application/x-navimap", "map"],
      ["application/x-navistyle", "stl"],
      ["application/x-netcdf", ["cdf", "nc"]],
      ["application/x-newton-compatible-pkg", "pkg"],
      ["application/x-nokia-9000-communicator-add-on-software", "aos"],
      ["application/x-omc", "omc"],
      ["application/x-omcdatamaker", "omcd"],
      ["application/x-omcregerator", "omcr"],
      ["application/x-pagemaker", ["pm4", "pm5"]],
      ["application/x-pcl", "pcl"],
      ["application/x-perfmon", ["pma", "pmc", "pml", "pmr", "pmw"]],
      ["application/x-pixclscript", "plx"],
      ["application/x-pkcs10", "p10"],
      ["application/x-pkcs12", ["p12", "pfx"]],
      ["application/x-pkcs7-certificates", ["p7b", "spc"]],
      ["application/x-pkcs7-certreqresp", "p7r"],
      ["application/x-pkcs7-mime", ["p7m", "p7c"]],
      ["application/x-pkcs7-signature", ["p7s", "p7a"]],
      ["application/x-pointplus", "css"],
      ["application/x-portable-anymap", "pnm"],
      ["application/x-project", ["mpc", "mpt", "mpv", "mpx"]],
      ["application/x-qpro", "wb1"],
      ["application/x-rar-compressed", "rar"],
      ["application/x-rtf", "rtf"],
      ["application/x-sdp", "sdp"],
      ["application/x-sea", "sea"],
      ["application/x-seelogo", "sl"],
      ["application/x-sh", "sh"],
      ["application/x-shar", ["shar", "sh"]],
      ["application/x-shockwave-flash", "swf"],
      ["application/x-silverlight-app", "xap"],
      ["application/x-sit", "sit"],
      ["application/x-sprite", ["spr", "sprite"]],
      ["application/x-stuffit", "sit"],
      ["application/x-stuffitx", "sitx"],
      ["application/x-sv4cpio", "sv4cpio"],
      ["application/x-sv4crc", "sv4crc"],
      ["application/x-tar", "tar"],
      ["application/x-tbook", ["sbk", "tbk"]],
      ["application/x-tcl", "tcl"],
      ["application/x-tex", "tex"],
      ["application/x-tex-tfm", "tfm"],
      ["application/x-texinfo", ["texi", "texinfo"]],
      ["application/x-troff", ["roff", "t", "tr"]],
      ["application/x-troff-man", "man"],
      ["application/x-troff-me", "me"],
      ["application/x-troff-ms", "ms"],
      ["application/x-troff-msvideo", "avi"],
      ["application/x-ustar", "ustar"],
      ["application/x-visio", ["vsd", "vst", "vsw"]],
      ["application/x-vnd.audioexplosion.mzz", "mzz"],
      ["application/x-vnd.ls-xpix", "xpix"],
      ["application/x-vrml", "vrml"],
      ["application/x-wais-source", ["src", "wsrc"]],
      ["application/x-winhelp", "hlp"],
      ["application/x-wintalk", "wtk"],
      ["application/x-world", ["wrl", "svr"]],
      ["application/x-wpwin", "wpd"],
      ["application/x-wri", "wri"],
      ["application/x-x509-ca-cert", ["cer", "crt", "der"]],
      ["application/x-x509-user-cert", "crt"],
      ["application/x-xfig", "fig"],
      ["application/x-xpinstall", "xpi"],
      ["application/x-zip-compressed", "zip"],
      ["application/xcap-diff+xml", "xdf"],
      ["application/xenc+xml", "xenc"],
      ["application/xhtml+xml", "xhtml"],
      ["application/xml", "xml"],
      ["application/xml-dtd", "dtd"],
      ["application/xop+xml", "xop"],
      ["application/xslt+xml", "xslt"],
      ["application/xspf+xml", "xspf"],
      ["application/xv+xml", "mxml"],
      ["application/yang", "yang"],
      ["application/yin+xml", "yin"],
      ["application/ynd.ms-pkipko", "pko"],
      ["application/zip", "zip"],
      ["audio/adpcm", "adp"],
      ["audio/aiff", ["aiff", "aif", "aifc"]],
      ["audio/basic", ["snd", "au"]],
      ["audio/it", "it"],
      ["audio/make", ["funk", "my", "pfunk"]],
      ["audio/make.my.funk", "pfunk"],
      ["audio/mid", ["mid", "rmi"]],
      ["audio/midi", ["midi", "kar", "mid"]],
      ["audio/mod", "mod"],
      ["audio/mp4", "mp4a"],
      ["audio/mpeg", ["mpga", "mp3", "m2a", "mp2", "mpa", "mpg"]],
      ["audio/mpeg3", "mp3"],
      ["audio/nspaudio", ["la", "lma"]],
      ["audio/ogg", "oga"],
      ["audio/s3m", "s3m"],
      ["audio/tsp-audio", "tsi"],
      ["audio/tsplayer", "tsp"],
      ["audio/vnd.dece.audio", "uva"],
      ["audio/vnd.digital-winds", "eol"],
      ["audio/vnd.dra", "dra"],
      ["audio/vnd.dts", "dts"],
      ["audio/vnd.dts.hd", "dtshd"],
      ["audio/vnd.lucent.voice", "lvp"],
      ["audio/vnd.ms-playready.media.pya", "pya"],
      ["audio/vnd.nuera.ecelp4800", "ecelp4800"],
      ["audio/vnd.nuera.ecelp7470", "ecelp7470"],
      ["audio/vnd.nuera.ecelp9600", "ecelp9600"],
      ["audio/vnd.qcelp", "qcp"],
      ["audio/vnd.rip", "rip"],
      ["audio/voc", "voc"],
      ["audio/voxware", "vox"],
      ["audio/wav", "wav"],
      ["audio/webm", "weba"],
      ["audio/x-aac", "aac"],
      ["audio/x-adpcm", "snd"],
      ["audio/x-aiff", ["aiff", "aif", "aifc"]],
      ["audio/x-au", "au"],
      ["audio/x-gsm", ["gsd", "gsm"]],
      ["audio/x-jam", "jam"],
      ["audio/x-liveaudio", "lam"],
      ["audio/x-mid", ["mid", "midi"]],
      ["audio/x-midi", ["midi", "mid"]],
      ["audio/x-mod", "mod"],
      ["audio/x-mpeg", "mp2"],
      ["audio/x-mpeg-3", "mp3"],
      ["audio/x-mpegurl", "m3u"],
      ["audio/x-mpequrl", "m3u"],
      ["audio/x-ms-wax", "wax"],
      ["audio/x-ms-wma", "wma"],
      ["audio/x-nspaudio", ["la", "lma"]],
      ["audio/x-pn-realaudio", ["ra", "ram", "rm", "rmm", "rmp"]],
      ["audio/x-pn-realaudio-plugin", ["ra", "rmp", "rpm"]],
      ["audio/x-psid", "sid"],
      ["audio/x-realaudio", "ra"],
      ["audio/x-twinvq", "vqf"],
      ["audio/x-twinvq-plugin", ["vqe", "vql"]],
      ["audio/x-vnd.audioexplosion.mjuicemediafile", "mjf"],
      ["audio/x-voc", "voc"],
      ["audio/x-wav", "wav"],
      ["audio/xm", "xm"],
      ["chemical/x-cdx", "cdx"],
      ["chemical/x-cif", "cif"],
      ["chemical/x-cmdf", "cmdf"],
      ["chemical/x-cml", "cml"],
      ["chemical/x-csml", "csml"],
      ["chemical/x-pdb", ["pdb", "xyz"]],
      ["chemical/x-xyz", "xyz"],
      ["drawing/x-dwf", "dwf"],
      ["i-world/i-vrml", "ivr"],
      ["image/bmp", ["bmp", "bm"]],
      ["image/cgm", "cgm"],
      ["image/cis-cod", "cod"],
      ["image/cmu-raster", ["ras", "rast"]],
      ["image/fif", "fif"],
      ["image/florian", ["flo", "turbot"]],
      ["image/g3fax", "g3"],
      ["image/gif", "gif"],
      ["image/ief", ["ief", "iefs"]],
      ["image/jpeg", ["jpeg", "jpe", "jpg", "jfif", "jfif-tbnl"]],
      ["image/jutvision", "jut"],
      ["image/ktx", "ktx"],
      ["image/naplps", ["nap", "naplps"]],
      ["image/pict", ["pic", "pict"]],
      ["image/pipeg", "jfif"],
      ["image/pjpeg", ["jfif", "jpe", "jpeg", "jpg"]],
      ["image/png", ["png", "x-png"]],
      ["image/prs.btif", "btif"],
      ["image/svg+xml", "svg"],
      ["image/tiff", ["tif", "tiff"]],
      ["image/vasa", "mcf"],
      ["image/vnd.adobe.photoshop", "psd"],
      ["image/vnd.dece.graphic", "uvi"],
      ["image/vnd.djvu", "djvu"],
      ["image/vnd.dvb.subtitle", "sub"],
      ["image/vnd.dwg", ["dwg", "dxf", "svf"]],
      ["image/vnd.dxf", "dxf"],
      ["image/vnd.fastbidsheet", "fbs"],
      ["image/vnd.fpx", "fpx"],
      ["image/vnd.fst", "fst"],
      ["image/vnd.fujixerox.edmics-mmr", "mmr"],
      ["image/vnd.fujixerox.edmics-rlc", "rlc"],
      ["image/vnd.ms-modi", "mdi"],
      ["image/vnd.net-fpx", ["fpx", "npx"]],
      ["image/vnd.rn-realflash", "rf"],
      ["image/vnd.rn-realpix", "rp"],
      ["image/vnd.wap.wbmp", "wbmp"],
      ["image/vnd.xiff", "xif"],
      ["image/webp", "webp"],
      ["image/x-cmu-raster", "ras"],
      ["image/x-cmx", "cmx"],
      ["image/x-dwg", ["dwg", "dxf", "svf"]],
      ["image/x-freehand", "fh"],
      ["image/x-icon", "ico"],
      ["image/x-jg", "art"],
      ["image/x-jps", "jps"],
      ["image/x-niff", ["niff", "nif"]],
      ["image/x-pcx", "pcx"],
      ["image/x-pict", ["pct", "pic"]],
      ["image/x-portable-anymap", "pnm"],
      ["image/x-portable-bitmap", "pbm"],
      ["image/x-portable-graymap", "pgm"],
      ["image/x-portable-greymap", "pgm"],
      ["image/x-portable-pixmap", "ppm"],
      ["image/x-quicktime", ["qif", "qti", "qtif"]],
      ["image/x-rgb", "rgb"],
      ["image/x-tiff", ["tif", "tiff"]],
      ["image/x-windows-bmp", "bmp"],
      ["image/x-xbitmap", "xbm"],
      ["image/x-xbm", "xbm"],
      ["image/x-xpixmap", ["xpm", "pm"]],
      ["image/x-xwd", "xwd"],
      ["image/x-xwindowdump", "xwd"],
      ["image/xbm", "xbm"],
      ["image/xpm", "xpm"],
      ["message/rfc822", ["eml", "mht", "mhtml", "nws", "mime"]],
      ["model/iges", ["iges", "igs"]],
      ["model/mesh", "msh"],
      ["model/vnd.collada+xml", "dae"],
      ["model/vnd.dwf", "dwf"],
      ["model/vnd.gdl", "gdl"],
      ["model/vnd.gtw", "gtw"],
      ["model/vnd.mts", "mts"],
      ["model/vnd.vtu", "vtu"],
      ["model/vrml", ["vrml", "wrl", "wrz"]],
      ["model/x-pov", "pov"],
      ["multipart/x-gzip", "gzip"],
      ["multipart/x-ustar", "ustar"],
      ["multipart/x-zip", "zip"],
      ["music/crescendo", ["mid", "midi"]],
      ["music/x-karaoke", "kar"],
      ["paleovu/x-pv", "pvu"],
      ["text/asp", "asp"],
      ["text/calendar", "ics"],
      ["text/css", "css"],
      ["text/csv", "csv"],
      ["text/ecmascript", "js"],
      ["text/h323", "323"],
      ["text/html", ["html", "htm", "stm", "acgi", "htmls", "htx", "shtml"]],
      ["text/iuls", "uls"],
      ["text/javascript", "js"],
      ["text/mcf", "mcf"],
      ["text/n3", "n3"],
      ["text/pascal", "pas"],
      [
        "text/plain",
        [
          "txt",
          "bas",
          "c",
          "h",
          "c++",
          "cc",
          "com",
          "conf",
          "cxx",
          "def",
          "f",
          "f90",
          "for",
          "g",
          "hh",
          "idc",
          "jav",
          "java",
          "list",
          "log",
          "lst",
          "m",
          "mar",
          "pl",
          "sdml",
          "text"
        ]
      ],
      ["text/plain-bas", "par"],
      ["text/prs.lines.tag", "dsc"],
      ["text/richtext", ["rtx", "rt", "rtf"]],
      ["text/scriplet", "wsc"],
      ["text/scriptlet", "sct"],
      ["text/sgml", ["sgm", "sgml"]],
      ["text/tab-separated-values", "tsv"],
      ["text/troff", "t"],
      ["text/turtle", "ttl"],
      ["text/uri-list", ["uni", "unis", "uri", "uris"]],
      ["text/vnd.abc", "abc"],
      ["text/vnd.curl", "curl"],
      ["text/vnd.curl.dcurl", "dcurl"],
      ["text/vnd.curl.mcurl", "mcurl"],
      ["text/vnd.curl.scurl", "scurl"],
      ["text/vnd.fly", "fly"],
      ["text/vnd.fmi.flexstor", "flx"],
      ["text/vnd.graphviz", "gv"],
      ["text/vnd.in3d.3dml", "3dml"],
      ["text/vnd.in3d.spot", "spot"],
      ["text/vnd.rn-realtext", "rt"],
      ["text/vnd.sun.j2me.app-descriptor", "jad"],
      ["text/vnd.wap.wml", "wml"],
      ["text/vnd.wap.wmlscript", "wmls"],
      ["text/webviewhtml", "htt"],
      ["text/x-asm", ["asm", "s"]],
      ["text/x-audiosoft-intra", "aip"],
      ["text/x-c", ["c", "cc", "cpp"]],
      ["text/x-component", "htc"],
      ["text/x-fortran", ["for", "f", "f77", "f90"]],
      ["text/x-h", ["h", "hh"]],
      ["text/x-java-source", ["java", "jav"]],
      ["text/x-java-source,java", "java"],
      ["text/x-la-asf", "lsx"],
      ["text/x-m", "m"],
      ["text/x-pascal", "p"],
      ["text/x-script", "hlb"],
      ["text/x-script.csh", "csh"],
      ["text/x-script.elisp", "el"],
      ["text/x-script.guile", "scm"],
      ["text/x-script.ksh", "ksh"],
      ["text/x-script.lisp", "lsp"],
      ["text/x-script.perl", "pl"],
      ["text/x-script.perl-module", "pm"],
      ["text/x-script.phyton", "py"],
      ["text/x-script.rexx", "rexx"],
      ["text/x-script.scheme", "scm"],
      ["text/x-script.sh", "sh"],
      ["text/x-script.tcl", "tcl"],
      ["text/x-script.tcsh", "tcsh"],
      ["text/x-script.zsh", "zsh"],
      ["text/x-server-parsed-html", ["shtml", "ssi"]],
      ["text/x-setext", "etx"],
      ["text/x-sgml", ["sgm", "sgml"]],
      ["text/x-speech", ["spc", "talk"]],
      ["text/x-uil", "uil"],
      ["text/x-uuencode", ["uu", "uue"]],
      ["text/x-vcalendar", "vcs"],
      ["text/x-vcard", "vcf"],
      ["text/xml", "xml"],
      ["video/3gpp", "3gp"],
      ["video/3gpp2", "3g2"],
      ["video/animaflex", "afl"],
      ["video/avi", "avi"],
      ["video/avs-video", "avs"],
      ["video/dl", "dl"],
      ["video/fli", "fli"],
      ["video/gl", "gl"],
      ["video/h261", "h261"],
      ["video/h263", "h263"],
      ["video/h264", "h264"],
      ["video/jpeg", "jpgv"],
      ["video/jpm", "jpm"],
      ["video/mj2", "mj2"],
      ["video/mp4", "mp4"],
      ["video/mpeg", ["mpeg", "mp2", "mpa", "mpe", "mpg", "mpv2", "m1v", "m2v", "mp3"]],
      ["video/msvideo", "avi"],
      ["video/ogg", "ogv"],
      ["video/quicktime", ["mov", "qt", "moov"]],
      ["video/vdo", "vdo"],
      ["video/vivo", ["viv", "vivo"]],
      ["video/vnd.dece.hd", "uvh"],
      ["video/vnd.dece.mobile", "uvm"],
      ["video/vnd.dece.pd", "uvp"],
      ["video/vnd.dece.sd", "uvs"],
      ["video/vnd.dece.video", "uvv"],
      ["video/vnd.fvt", "fvt"],
      ["video/vnd.mpegurl", "mxu"],
      ["video/vnd.ms-playready.media.pyv", "pyv"],
      ["video/vnd.rn-realvideo", "rv"],
      ["video/vnd.uvvu.mp4", "uvu"],
      ["video/vnd.vivo", ["viv", "vivo"]],
      ["video/vosaic", "vos"],
      ["video/webm", "webm"],
      ["video/x-amt-demorun", "xdr"],
      ["video/x-amt-showrun", "xsr"],
      ["video/x-atomic3d-feature", "fmf"],
      ["video/x-dl", "dl"],
      ["video/x-dv", ["dif", "dv"]],
      ["video/x-f4v", "f4v"],
      ["video/x-fli", "fli"],
      ["video/x-flv", "flv"],
      ["video/x-gl", "gl"],
      ["video/x-isvideo", "isu"],
      ["video/x-la-asf", ["lsf", "lsx"]],
      ["video/x-m4v", "m4v"],
      ["video/x-motion-jpeg", "mjpg"],
      ["video/x-mpeg", ["mp3", "mp2"]],
      ["video/x-mpeq2a", "mp2"],
      ["video/x-ms-asf", ["asf", "asr", "asx"]],
      ["video/x-ms-asf-plugin", "asx"],
      ["video/x-ms-wm", "wm"],
      ["video/x-ms-wmv", "wmv"],
      ["video/x-ms-wmx", "wmx"],
      ["video/x-ms-wvx", "wvx"],
      ["video/x-msvideo", "avi"],
      ["video/x-qtc", "qtc"],
      ["video/x-scm", "scm"],
      ["video/x-sgi-movie", ["movie", "mv"]],
      ["windows/metafile", "wmf"],
      ["www/mime", "mime"],
      ["x-conference/x-cooltalk", "ice"],
      ["x-music/x-midi", ["mid", "midi"]],
      ["x-world/x-3dmf", ["3dm", "3dmf", "qd3", "qd3d"]],
      ["x-world/x-svr", "svr"],
      ["x-world/x-vrml", ["flr", "vrml", "wrl", "wrz", "xaf", "xof"]],
      ["x-world/x-vrt", "vrt"],
      ["xgl/drawing", "xgz"],
      ["xgl/movie", "xmz"]
    ]);
    var extensions = /* @__PURE__ */ new Map([
      ["123", "application/vnd.lotus-1-2-3"],
      ["323", "text/h323"],
      ["*", "application/octet-stream"],
      ["3dm", "x-world/x-3dmf"],
      ["3dmf", "x-world/x-3dmf"],
      ["3dml", "text/vnd.in3d.3dml"],
      ["3g2", "video/3gpp2"],
      ["3gp", "video/3gpp"],
      ["7z", "application/x-7z-compressed"],
      ["a", "application/octet-stream"],
      ["aab", "application/x-authorware-bin"],
      ["aac", "audio/x-aac"],
      ["aam", "application/x-authorware-map"],
      ["aas", "application/x-authorware-seg"],
      ["abc", "text/vnd.abc"],
      ["abw", "application/x-abiword"],
      ["ac", "application/pkix-attr-cert"],
      ["acc", "application/vnd.americandynamics.acc"],
      ["ace", "application/x-ace-compressed"],
      ["acgi", "text/html"],
      ["acu", "application/vnd.acucobol"],
      ["acx", "application/internet-property-stream"],
      ["adp", "audio/adpcm"],
      ["aep", "application/vnd.audiograph"],
      ["afl", "video/animaflex"],
      ["afp", "application/vnd.ibm.modcap"],
      ["ahead", "application/vnd.ahead.space"],
      ["ai", "application/postscript"],
      ["aif", ["audio/aiff", "audio/x-aiff"]],
      ["aifc", ["audio/aiff", "audio/x-aiff"]],
      ["aiff", ["audio/aiff", "audio/x-aiff"]],
      ["aim", "application/x-aim"],
      ["aip", "text/x-audiosoft-intra"],
      ["air", "application/vnd.adobe.air-application-installer-package+zip"],
      ["ait", "application/vnd.dvb.ait"],
      ["ami", "application/vnd.amiga.ami"],
      ["ani", "application/x-navi-animation"],
      ["aos", "application/x-nokia-9000-communicator-add-on-software"],
      ["apk", "application/vnd.android.package-archive"],
      ["application", "application/x-ms-application"],
      ["apr", "application/vnd.lotus-approach"],
      ["aps", "application/mime"],
      ["arc", "application/octet-stream"],
      ["arj", ["application/arj", "application/octet-stream"]],
      ["art", "image/x-jg"],
      ["asf", "video/x-ms-asf"],
      ["asm", "text/x-asm"],
      ["aso", "application/vnd.accpac.simply.aso"],
      ["asp", "text/asp"],
      ["asr", "video/x-ms-asf"],
      ["asx", ["video/x-ms-asf", "application/x-mplayer2", "video/x-ms-asf-plugin"]],
      ["atc", "application/vnd.acucorp"],
      ["atomcat", "application/atomcat+xml"],
      ["atomsvc", "application/atomsvc+xml"],
      ["atx", "application/vnd.antix.game-component"],
      ["au", ["audio/basic", "audio/x-au"]],
      ["avi", ["video/avi", "video/msvideo", "application/x-troff-msvideo", "video/x-msvideo"]],
      ["avs", "video/avs-video"],
      ["aw", "application/applixware"],
      ["axs", "application/olescript"],
      ["azf", "application/vnd.airzip.filesecure.azf"],
      ["azs", "application/vnd.airzip.filesecure.azs"],
      ["azw", "application/vnd.amazon.ebook"],
      ["bas", "text/plain"],
      ["bcpio", "application/x-bcpio"],
      ["bdf", "application/x-font-bdf"],
      ["bdm", "application/vnd.syncml.dm+wbxml"],
      ["bed", "application/vnd.realvnc.bed"],
      ["bh2", "application/vnd.fujitsu.oasysprs"],
      ["bin", ["application/octet-stream", "application/mac-binary", "application/macbinary", "application/x-macbinary", "application/x-binary"]],
      ["bm", "image/bmp"],
      ["bmi", "application/vnd.bmi"],
      ["bmp", ["image/bmp", "image/x-windows-bmp"]],
      ["boo", "application/book"],
      ["book", "application/book"],
      ["box", "application/vnd.previewsystems.box"],
      ["boz", "application/x-bzip2"],
      ["bsh", "application/x-bsh"],
      ["btif", "image/prs.btif"],
      ["bz", "application/x-bzip"],
      ["bz2", "application/x-bzip2"],
      ["c", ["text/plain", "text/x-c"]],
      ["c++", "text/plain"],
      ["c11amc", "application/vnd.cluetrust.cartomobile-config"],
      ["c11amz", "application/vnd.cluetrust.cartomobile-config-pkg"],
      ["c4g", "application/vnd.clonk.c4group"],
      ["cab", "application/vnd.ms-cab-compressed"],
      ["car", "application/vnd.curl.car"],
      ["cat", ["application/vnd.ms-pkiseccat", "application/vnd.ms-pki.seccat"]],
      ["cc", ["text/plain", "text/x-c"]],
      ["ccad", "application/clariscad"],
      ["cco", "application/x-cocoa"],
      ["ccxml", "application/ccxml+xml,"],
      ["cdbcmsg", "application/vnd.contact.cmsg"],
      ["cdf", ["application/cdf", "application/x-cdf", "application/x-netcdf"]],
      ["cdkey", "application/vnd.mediastation.cdkey"],
      ["cdmia", "application/cdmi-capability"],
      ["cdmic", "application/cdmi-container"],
      ["cdmid", "application/cdmi-domain"],
      ["cdmio", "application/cdmi-object"],
      ["cdmiq", "application/cdmi-queue"],
      ["cdx", "chemical/x-cdx"],
      ["cdxml", "application/vnd.chemdraw+xml"],
      ["cdy", "application/vnd.cinderella"],
      ["cer", ["application/pkix-cert", "application/x-x509-ca-cert"]],
      ["cgm", "image/cgm"],
      ["cha", "application/x-chat"],
      ["chat", "application/x-chat"],
      ["chm", "application/vnd.ms-htmlhelp"],
      ["chrt", "application/vnd.kde.kchart"],
      ["cif", "chemical/x-cif"],
      ["cii", "application/vnd.anser-web-certificate-issue-initiation"],
      ["cil", "application/vnd.ms-artgalry"],
      ["cla", "application/vnd.claymore"],
      ["class", ["application/octet-stream", "application/java", "application/java-byte-code", "application/java-vm", "application/x-java-class"]],
      ["clkk", "application/vnd.crick.clicker.keyboard"],
      ["clkp", "application/vnd.crick.clicker.palette"],
      ["clkt", "application/vnd.crick.clicker.template"],
      ["clkw", "application/vnd.crick.clicker.wordbank"],
      ["clkx", "application/vnd.crick.clicker"],
      ["clp", "application/x-msclip"],
      ["cmc", "application/vnd.cosmocaller"],
      ["cmdf", "chemical/x-cmdf"],
      ["cml", "chemical/x-cml"],
      ["cmp", "application/vnd.yellowriver-custom-menu"],
      ["cmx", "image/x-cmx"],
      ["cod", ["image/cis-cod", "application/vnd.rim.cod"]],
      ["com", ["application/octet-stream", "text/plain"]],
      ["conf", "text/plain"],
      ["cpio", "application/x-cpio"],
      ["cpp", "text/x-c"],
      ["cpt", ["application/mac-compactpro", "application/x-compactpro", "application/x-cpt"]],
      ["crd", "application/x-mscardfile"],
      ["crl", ["application/pkix-crl", "application/pkcs-crl"]],
      ["crt", ["application/pkix-cert", "application/x-x509-user-cert", "application/x-x509-ca-cert"]],
      ["cryptonote", "application/vnd.rig.cryptonote"],
      ["csh", ["text/x-script.csh", "application/x-csh"]],
      ["csml", "chemical/x-csml"],
      ["csp", "application/vnd.commonspace"],
      ["css", ["text/css", "application/x-pointplus"]],
      ["csv", "text/csv"],
      ["cu", "application/cu-seeme"],
      ["curl", "text/vnd.curl"],
      ["cww", "application/prs.cww"],
      ["cxx", "text/plain"],
      ["dae", "model/vnd.collada+xml"],
      ["daf", "application/vnd.mobius.daf"],
      ["davmount", "application/davmount+xml"],
      ["dcr", "application/x-director"],
      ["dcurl", "text/vnd.curl.dcurl"],
      ["dd2", "application/vnd.oma.dd2+xml"],
      ["ddd", "application/vnd.fujixerox.ddd"],
      ["deb", "application/x-debian-package"],
      ["deepv", "application/x-deepv"],
      ["def", "text/plain"],
      ["der", "application/x-x509-ca-cert"],
      ["dfac", "application/vnd.dreamfactory"],
      ["dif", "video/x-dv"],
      ["dir", "application/x-director"],
      ["dis", "application/vnd.mobius.dis"],
      ["djvu", "image/vnd.djvu"],
      ["dl", ["video/dl", "video/x-dl"]],
      ["dll", "application/x-msdownload"],
      ["dms", "application/octet-stream"],
      ["dna", "application/vnd.dna"],
      ["doc", "application/msword"],
      ["docm", "application/vnd.ms-word.document.macroenabled.12"],
      ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      ["dot", "application/msword"],
      ["dotm", "application/vnd.ms-word.template.macroenabled.12"],
      ["dotx", "application/vnd.openxmlformats-officedocument.wordprocessingml.template"],
      ["dp", ["application/commonground", "application/vnd.osgi.dp"]],
      ["dpg", "application/vnd.dpgraph"],
      ["dra", "audio/vnd.dra"],
      ["drw", "application/drafting"],
      ["dsc", "text/prs.lines.tag"],
      ["dssc", "application/dssc+der"],
      ["dtb", "application/x-dtbook+xml"],
      ["dtd", "application/xml-dtd"],
      ["dts", "audio/vnd.dts"],
      ["dtshd", "audio/vnd.dts.hd"],
      ["dump", "application/octet-stream"],
      ["dv", "video/x-dv"],
      ["dvi", "application/x-dvi"],
      ["dwf", ["model/vnd.dwf", "drawing/x-dwf"]],
      ["dwg", ["application/acad", "image/vnd.dwg", "image/x-dwg"]],
      ["dxf", ["application/dxf", "image/vnd.dwg", "image/vnd.dxf", "image/x-dwg"]],
      ["dxp", "application/vnd.spotfire.dxp"],
      ["dxr", "application/x-director"],
      ["ecelp4800", "audio/vnd.nuera.ecelp4800"],
      ["ecelp7470", "audio/vnd.nuera.ecelp7470"],
      ["ecelp9600", "audio/vnd.nuera.ecelp9600"],
      ["edm", "application/vnd.novadigm.edm"],
      ["edx", "application/vnd.novadigm.edx"],
      ["efif", "application/vnd.picsel"],
      ["ei6", "application/vnd.pg.osasli"],
      ["el", "text/x-script.elisp"],
      ["elc", ["application/x-elc", "application/x-bytecode.elisp"]],
      ["eml", "message/rfc822"],
      ["emma", "application/emma+xml"],
      ["env", "application/x-envoy"],
      ["eol", "audio/vnd.digital-winds"],
      ["eot", "application/vnd.ms-fontobject"],
      ["eps", "application/postscript"],
      ["epub", "application/epub+zip"],
      ["es", ["application/ecmascript", "application/x-esrehber"]],
      ["es3", "application/vnd.eszigno3+xml"],
      ["esf", "application/vnd.epson.esf"],
      ["etx", "text/x-setext"],
      ["evy", ["application/envoy", "application/x-envoy"]],
      ["exe", ["application/octet-stream", "application/x-msdownload"]],
      ["exi", "application/exi"],
      ["ext", "application/vnd.novadigm.ext"],
      ["ez2", "application/vnd.ezpix-album"],
      ["ez3", "application/vnd.ezpix-package"],
      ["f", ["text/plain", "text/x-fortran"]],
      ["f4v", "video/x-f4v"],
      ["f77", "text/x-fortran"],
      ["f90", ["text/plain", "text/x-fortran"]],
      ["fbs", "image/vnd.fastbidsheet"],
      ["fcs", "application/vnd.isac.fcs"],
      ["fdf", "application/vnd.fdf"],
      ["fe_launch", "application/vnd.denovo.fcselayout-link"],
      ["fg5", "application/vnd.fujitsu.oasysgp"],
      ["fh", "image/x-freehand"],
      ["fif", ["application/fractals", "image/fif"]],
      ["fig", "application/x-xfig"],
      ["fli", ["video/fli", "video/x-fli"]],
      ["flo", ["image/florian", "application/vnd.micrografx.flo"]],
      ["flr", "x-world/x-vrml"],
      ["flv", "video/x-flv"],
      ["flw", "application/vnd.kde.kivio"],
      ["flx", "text/vnd.fmi.flexstor"],
      ["fly", "text/vnd.fly"],
      ["fm", "application/vnd.framemaker"],
      ["fmf", "video/x-atomic3d-feature"],
      ["fnc", "application/vnd.frogans.fnc"],
      ["for", ["text/plain", "text/x-fortran"]],
      ["fpx", ["image/vnd.fpx", "image/vnd.net-fpx"]],
      ["frl", "application/freeloader"],
      ["fsc", "application/vnd.fsc.weblaunch"],
      ["fst", "image/vnd.fst"],
      ["ftc", "application/vnd.fluxtime.clip"],
      ["fti", "application/vnd.anser-web-funds-transfer-initiation"],
      ["funk", "audio/make"],
      ["fvt", "video/vnd.fvt"],
      ["fxp", "application/vnd.adobe.fxp"],
      ["fzs", "application/vnd.fuzzysheet"],
      ["g", "text/plain"],
      ["g2w", "application/vnd.geoplan"],
      ["g3", "image/g3fax"],
      ["g3w", "application/vnd.geospace"],
      ["gac", "application/vnd.groove-account"],
      ["gdl", "model/vnd.gdl"],
      ["geo", "application/vnd.dynageo"],
      ["geojson", "application/geo+json"],
      ["gex", "application/vnd.geometry-explorer"],
      ["ggb", "application/vnd.geogebra.file"],
      ["ggt", "application/vnd.geogebra.tool"],
      ["ghf", "application/vnd.groove-help"],
      ["gif", "image/gif"],
      ["gim", "application/vnd.groove-identity-message"],
      ["gl", ["video/gl", "video/x-gl"]],
      ["gmx", "application/vnd.gmx"],
      ["gnumeric", "application/x-gnumeric"],
      ["gph", "application/vnd.flographit"],
      ["gqf", "application/vnd.grafeq"],
      ["gram", "application/srgs"],
      ["grv", "application/vnd.groove-injector"],
      ["grxml", "application/srgs+xml"],
      ["gsd", "audio/x-gsm"],
      ["gsf", "application/x-font-ghostscript"],
      ["gsm", "audio/x-gsm"],
      ["gsp", "application/x-gsp"],
      ["gss", "application/x-gss"],
      ["gtar", "application/x-gtar"],
      ["gtm", "application/vnd.groove-tool-message"],
      ["gtw", "model/vnd.gtw"],
      ["gv", "text/vnd.graphviz"],
      ["gxt", "application/vnd.geonext"],
      ["gz", ["application/x-gzip", "application/x-compressed"]],
      ["gzip", ["multipart/x-gzip", "application/x-gzip"]],
      ["h", ["text/plain", "text/x-h"]],
      ["h261", "video/h261"],
      ["h263", "video/h263"],
      ["h264", "video/h264"],
      ["hal", "application/vnd.hal+xml"],
      ["hbci", "application/vnd.hbci"],
      ["hdf", "application/x-hdf"],
      ["help", "application/x-helpfile"],
      ["hgl", "application/vnd.hp-hpgl"],
      ["hh", ["text/plain", "text/x-h"]],
      ["hlb", "text/x-script"],
      ["hlp", ["application/winhlp", "application/hlp", "application/x-helpfile", "application/x-winhelp"]],
      ["hpg", "application/vnd.hp-hpgl"],
      ["hpgl", "application/vnd.hp-hpgl"],
      ["hpid", "application/vnd.hp-hpid"],
      ["hps", "application/vnd.hp-hps"],
      [
        "hqx",
        [
          "application/mac-binhex40",
          "application/binhex",
          "application/binhex4",
          "application/mac-binhex",
          "application/x-binhex40",
          "application/x-mac-binhex40"
        ]
      ],
      ["hta", "application/hta"],
      ["htc", "text/x-component"],
      ["htke", "application/vnd.kenameaapp"],
      ["htm", "text/html"],
      ["html", "text/html"],
      ["htmls", "text/html"],
      ["htt", "text/webviewhtml"],
      ["htx", "text/html"],
      ["hvd", "application/vnd.yamaha.hv-dic"],
      ["hvp", "application/vnd.yamaha.hv-voice"],
      ["hvs", "application/vnd.yamaha.hv-script"],
      ["i2g", "application/vnd.intergeo"],
      ["icc", "application/vnd.iccprofile"],
      ["ice", "x-conference/x-cooltalk"],
      ["ico", "image/x-icon"],
      ["ics", "text/calendar"],
      ["idc", "text/plain"],
      ["ief", "image/ief"],
      ["iefs", "image/ief"],
      ["ifm", "application/vnd.shana.informed.formdata"],
      ["iges", ["application/iges", "model/iges"]],
      ["igl", "application/vnd.igloader"],
      ["igm", "application/vnd.insors.igm"],
      ["igs", ["application/iges", "model/iges"]],
      ["igx", "application/vnd.micrografx.igx"],
      ["iif", "application/vnd.shana.informed.interchange"],
      ["iii", "application/x-iphone"],
      ["ima", "application/x-ima"],
      ["imap", "application/x-httpd-imap"],
      ["imp", "application/vnd.accpac.simply.imp"],
      ["ims", "application/vnd.ms-ims"],
      ["inf", "application/inf"],
      ["ins", ["application/x-internet-signup", "application/x-internett-signup"]],
      ["ip", "application/x-ip2"],
      ["ipfix", "application/ipfix"],
      ["ipk", "application/vnd.shana.informed.package"],
      ["irm", "application/vnd.ibm.rights-management"],
      ["irp", "application/vnd.irepository.package+xml"],
      ["isp", "application/x-internet-signup"],
      ["isu", "video/x-isvideo"],
      ["it", "audio/it"],
      ["itp", "application/vnd.shana.informed.formtemplate"],
      ["iv", "application/x-inventor"],
      ["ivp", "application/vnd.immervision-ivp"],
      ["ivr", "i-world/i-vrml"],
      ["ivu", "application/vnd.immervision-ivu"],
      ["ivy", "application/x-livescreen"],
      ["jad", "text/vnd.sun.j2me.app-descriptor"],
      ["jam", ["application/vnd.jam", "audio/x-jam"]],
      ["jar", "application/java-archive"],
      ["jav", ["text/plain", "text/x-java-source"]],
      ["java", ["text/plain", "text/x-java-source,java", "text/x-java-source"]],
      ["jcm", "application/x-java-commerce"],
      ["jfif", ["image/pipeg", "image/jpeg", "image/pjpeg"]],
      ["jfif-tbnl", "image/jpeg"],
      ["jisp", "application/vnd.jisp"],
      ["jlt", "application/vnd.hp-jlyt"],
      ["jnlp", "application/x-java-jnlp-file"],
      ["joda", "application/vnd.joost.joda-archive"],
      ["jpe", ["image/jpeg", "image/pjpeg"]],
      ["jpeg", ["image/jpeg", "image/pjpeg"]],
      ["jpg", ["image/jpeg", "image/pjpeg"]],
      ["jpgv", "video/jpeg"],
      ["jpm", "video/jpm"],
      ["jps", "image/x-jps"],
      ["js", ["application/javascript", "application/ecmascript", "text/javascript", "text/ecmascript", "application/x-javascript"]],
      ["json", "application/json"],
      ["jut", "image/jutvision"],
      ["kar", ["audio/midi", "music/x-karaoke"]],
      ["karbon", "application/vnd.kde.karbon"],
      ["kfo", "application/vnd.kde.kformula"],
      ["kia", "application/vnd.kidspiration"],
      ["kml", "application/vnd.google-earth.kml+xml"],
      ["kmz", "application/vnd.google-earth.kmz"],
      ["kne", "application/vnd.kinar"],
      ["kon", "application/vnd.kde.kontour"],
      ["kpr", "application/vnd.kde.kpresenter"],
      ["ksh", ["application/x-ksh", "text/x-script.ksh"]],
      ["ksp", "application/vnd.kde.kspread"],
      ["ktx", "image/ktx"],
      ["ktz", "application/vnd.kahootz"],
      ["kwd", "application/vnd.kde.kword"],
      ["la", ["audio/nspaudio", "audio/x-nspaudio"]],
      ["lam", "audio/x-liveaudio"],
      ["lasxml", "application/vnd.las.las+xml"],
      ["latex", "application/x-latex"],
      ["lbd", "application/vnd.llamagraphics.life-balance.desktop"],
      ["lbe", "application/vnd.llamagraphics.life-balance.exchange+xml"],
      ["les", "application/vnd.hhe.lesson-player"],
      ["lha", ["application/octet-stream", "application/lha", "application/x-lha"]],
      ["lhx", "application/octet-stream"],
      ["link66", "application/vnd.route66.link66+xml"],
      ["list", "text/plain"],
      ["lma", ["audio/nspaudio", "audio/x-nspaudio"]],
      ["log", "text/plain"],
      ["lrm", "application/vnd.ms-lrm"],
      ["lsf", "video/x-la-asf"],
      ["lsp", ["application/x-lisp", "text/x-script.lisp"]],
      ["lst", "text/plain"],
      ["lsx", ["video/x-la-asf", "text/x-la-asf"]],
      ["ltf", "application/vnd.frogans.ltf"],
      ["ltx", "application/x-latex"],
      ["lvp", "audio/vnd.lucent.voice"],
      ["lwp", "application/vnd.lotus-wordpro"],
      ["lzh", ["application/octet-stream", "application/x-lzh"]],
      ["lzx", ["application/lzx", "application/octet-stream", "application/x-lzx"]],
      ["m", ["text/plain", "text/x-m"]],
      ["m13", "application/x-msmediaview"],
      ["m14", "application/x-msmediaview"],
      ["m1v", "video/mpeg"],
      ["m21", "application/mp21"],
      ["m2a", "audio/mpeg"],
      ["m2v", "video/mpeg"],
      ["m3u", ["audio/x-mpegurl", "audio/x-mpequrl"]],
      ["m3u8", "application/vnd.apple.mpegurl"],
      ["m4v", "video/x-m4v"],
      ["ma", "application/mathematica"],
      ["mads", "application/mads+xml"],
      ["mag", "application/vnd.ecowin.chart"],
      ["man", "application/x-troff-man"],
      ["map", "application/x-navimap"],
      ["mar", "text/plain"],
      ["mathml", "application/mathml+xml"],
      ["mbd", "application/mbedlet"],
      ["mbk", "application/vnd.mobius.mbk"],
      ["mbox", "application/mbox"],
      ["mc$", "application/x-magic-cap-package-1.0"],
      ["mc1", "application/vnd.medcalcdata"],
      ["mcd", ["application/mcad", "application/vnd.mcd", "application/x-mathcad"]],
      ["mcf", ["image/vasa", "text/mcf"]],
      ["mcp", "application/netmc"],
      ["mcurl", "text/vnd.curl.mcurl"],
      ["mdb", "application/x-msaccess"],
      ["mdi", "image/vnd.ms-modi"],
      ["me", "application/x-troff-me"],
      ["meta4", "application/metalink4+xml"],
      ["mets", "application/mets+xml"],
      ["mfm", "application/vnd.mfmp"],
      ["mgp", "application/vnd.osgeo.mapguide.package"],
      ["mgz", "application/vnd.proteus.magazine"],
      ["mht", "message/rfc822"],
      ["mhtml", "message/rfc822"],
      ["mid", ["audio/mid", "audio/midi", "music/crescendo", "x-music/x-midi", "audio/x-midi", "application/x-midi", "audio/x-mid"]],
      ["midi", ["audio/midi", "music/crescendo", "x-music/x-midi", "audio/x-midi", "application/x-midi", "audio/x-mid"]],
      ["mif", ["application/vnd.mif", "application/x-mif", "application/x-frame"]],
      ["mime", ["message/rfc822", "www/mime"]],
      ["mj2", "video/mj2"],
      ["mjf", "audio/x-vnd.audioexplosion.mjuicemediafile"],
      ["mjpg", "video/x-motion-jpeg"],
      ["mlp", "application/vnd.dolby.mlp"],
      ["mm", ["application/base64", "application/x-meme"]],
      ["mmd", "application/vnd.chipnuts.karaoke-mmd"],
      ["mme", "application/base64"],
      ["mmf", "application/vnd.smaf"],
      ["mmr", "image/vnd.fujixerox.edmics-mmr"],
      ["mny", "application/x-msmoney"],
      ["mod", ["audio/mod", "audio/x-mod"]],
      ["mods", "application/mods+xml"],
      ["moov", "video/quicktime"],
      ["mov", "video/quicktime"],
      ["movie", "video/x-sgi-movie"],
      ["mp2", ["video/mpeg", "audio/mpeg", "video/x-mpeg", "audio/x-mpeg", "video/x-mpeq2a"]],
      ["mp3", ["audio/mpeg", "audio/mpeg3", "video/mpeg", "audio/x-mpeg-3", "video/x-mpeg"]],
      ["mp4", ["video/mp4", "application/mp4"]],
      ["mp4a", "audio/mp4"],
      ["mpa", ["video/mpeg", "audio/mpeg"]],
      ["mpc", ["application/vnd.mophun.certificate", "application/x-project"]],
      ["mpe", "video/mpeg"],
      ["mpeg", "video/mpeg"],
      ["mpg", ["video/mpeg", "audio/mpeg"]],
      ["mpga", "audio/mpeg"],
      ["mpkg", "application/vnd.apple.installer+xml"],
      ["mpm", "application/vnd.blueice.multipass"],
      ["mpn", "application/vnd.mophun.application"],
      ["mpp", "application/vnd.ms-project"],
      ["mpt", "application/x-project"],
      ["mpv", "application/x-project"],
      ["mpv2", "video/mpeg"],
      ["mpx", "application/x-project"],
      ["mpy", "application/vnd.ibm.minipay"],
      ["mqy", "application/vnd.mobius.mqy"],
      ["mrc", "application/marc"],
      ["mrcx", "application/marcxml+xml"],
      ["ms", "application/x-troff-ms"],
      ["mscml", "application/mediaservercontrol+xml"],
      ["mseq", "application/vnd.mseq"],
      ["msf", "application/vnd.epson.msf"],
      ["msg", "application/vnd.ms-outlook"],
      ["msh", "model/mesh"],
      ["msl", "application/vnd.mobius.msl"],
      ["msty", "application/vnd.muvee.style"],
      ["mts", "model/vnd.mts"],
      ["mus", "application/vnd.musician"],
      ["musicxml", "application/vnd.recordare.musicxml+xml"],
      ["mv", "video/x-sgi-movie"],
      ["mvb", "application/x-msmediaview"],
      ["mwf", "application/vnd.mfer"],
      ["mxf", "application/mxf"],
      ["mxl", "application/vnd.recordare.musicxml"],
      ["mxml", "application/xv+xml"],
      ["mxs", "application/vnd.triscape.mxs"],
      ["mxu", "video/vnd.mpegurl"],
      ["my", "audio/make"],
      ["mzz", "application/x-vnd.audioexplosion.mzz"],
      ["n-gage", "application/vnd.nokia.n-gage.symbian.install"],
      ["n3", "text/n3"],
      ["nap", "image/naplps"],
      ["naplps", "image/naplps"],
      ["nbp", "application/vnd.wolfram.player"],
      ["nc", "application/x-netcdf"],
      ["ncm", "application/vnd.nokia.configuration-message"],
      ["ncx", "application/x-dtbncx+xml"],
      ["ngdat", "application/vnd.nokia.n-gage.data"],
      ["nif", "image/x-niff"],
      ["niff", "image/x-niff"],
      ["nix", "application/x-mix-transfer"],
      ["nlu", "application/vnd.neurolanguage.nlu"],
      ["nml", "application/vnd.enliven"],
      ["nnd", "application/vnd.noblenet-directory"],
      ["nns", "application/vnd.noblenet-sealer"],
      ["nnw", "application/vnd.noblenet-web"],
      ["npx", "image/vnd.net-fpx"],
      ["nsc", "application/x-conference"],
      ["nsf", "application/vnd.lotus-notes"],
      ["nvd", "application/x-navidoc"],
      ["nws", "message/rfc822"],
      ["o", "application/octet-stream"],
      ["oa2", "application/vnd.fujitsu.oasys2"],
      ["oa3", "application/vnd.fujitsu.oasys3"],
      ["oas", "application/vnd.fujitsu.oasys"],
      ["obd", "application/x-msbinder"],
      ["oda", "application/oda"],
      ["odb", "application/vnd.oasis.opendocument.database"],
      ["odc", "application/vnd.oasis.opendocument.chart"],
      ["odf", "application/vnd.oasis.opendocument.formula"],
      ["odft", "application/vnd.oasis.opendocument.formula-template"],
      ["odg", "application/vnd.oasis.opendocument.graphics"],
      ["odi", "application/vnd.oasis.opendocument.image"],
      ["odm", "application/vnd.oasis.opendocument.text-master"],
      ["odp", "application/vnd.oasis.opendocument.presentation"],
      ["ods", "application/vnd.oasis.opendocument.spreadsheet"],
      ["odt", "application/vnd.oasis.opendocument.text"],
      ["oga", "audio/ogg"],
      ["ogv", "video/ogg"],
      ["ogx", "application/ogg"],
      ["omc", "application/x-omc"],
      ["omcd", "application/x-omcdatamaker"],
      ["omcr", "application/x-omcregerator"],
      ["onetoc", "application/onenote"],
      ["opf", "application/oebps-package+xml"],
      ["org", "application/vnd.lotus-organizer"],
      ["osf", "application/vnd.yamaha.openscoreformat"],
      ["osfpvg", "application/vnd.yamaha.openscoreformat.osfpvg+xml"],
      ["otc", "application/vnd.oasis.opendocument.chart-template"],
      ["otf", "application/x-font-otf"],
      ["otg", "application/vnd.oasis.opendocument.graphics-template"],
      ["oth", "application/vnd.oasis.opendocument.text-web"],
      ["oti", "application/vnd.oasis.opendocument.image-template"],
      ["otp", "application/vnd.oasis.opendocument.presentation-template"],
      ["ots", "application/vnd.oasis.opendocument.spreadsheet-template"],
      ["ott", "application/vnd.oasis.opendocument.text-template"],
      ["oxt", "application/vnd.openofficeorg.extension"],
      ["p", "text/x-pascal"],
      ["p10", ["application/pkcs10", "application/x-pkcs10"]],
      ["p12", ["application/pkcs-12", "application/x-pkcs12"]],
      ["p7a", "application/x-pkcs7-signature"],
      ["p7b", "application/x-pkcs7-certificates"],
      ["p7c", ["application/pkcs7-mime", "application/x-pkcs7-mime"]],
      ["p7m", ["application/pkcs7-mime", "application/x-pkcs7-mime"]],
      ["p7r", "application/x-pkcs7-certreqresp"],
      ["p7s", ["application/pkcs7-signature", "application/x-pkcs7-signature"]],
      ["p8", "application/pkcs8"],
      ["par", "text/plain-bas"],
      ["part", "application/pro_eng"],
      ["pas", "text/pascal"],
      ["paw", "application/vnd.pawaafile"],
      ["pbd", "application/vnd.powerbuilder6"],
      ["pbm", "image/x-portable-bitmap"],
      ["pcf", "application/x-font-pcf"],
      ["pcl", ["application/vnd.hp-pcl", "application/x-pcl"]],
      ["pclxl", "application/vnd.hp-pclxl"],
      ["pct", "image/x-pict"],
      ["pcurl", "application/vnd.curl.pcurl"],
      ["pcx", "image/x-pcx"],
      ["pdb", ["application/vnd.palm", "chemical/x-pdb"]],
      ["pdf", "application/pdf"],
      ["pfa", "application/x-font-type1"],
      ["pfr", "application/font-tdpfr"],
      ["pfunk", ["audio/make", "audio/make.my.funk"]],
      ["pfx", "application/x-pkcs12"],
      ["pgm", ["image/x-portable-graymap", "image/x-portable-greymap"]],
      ["pgn", "application/x-chess-pgn"],
      ["pgp", "application/pgp-signature"],
      ["pic", ["image/pict", "image/x-pict"]],
      ["pict", "image/pict"],
      ["pkg", "application/x-newton-compatible-pkg"],
      ["pki", "application/pkixcmp"],
      ["pkipath", "application/pkix-pkipath"],
      ["pko", ["application/ynd.ms-pkipko", "application/vnd.ms-pki.pko"]],
      ["pl", ["text/plain", "text/x-script.perl"]],
      ["plb", "application/vnd.3gpp.pic-bw-large"],
      ["plc", "application/vnd.mobius.plc"],
      ["plf", "application/vnd.pocketlearn"],
      ["pls", "application/pls+xml"],
      ["plx", "application/x-pixclscript"],
      ["pm", ["text/x-script.perl-module", "image/x-xpixmap"]],
      ["pm4", "application/x-pagemaker"],
      ["pm5", "application/x-pagemaker"],
      ["pma", "application/x-perfmon"],
      ["pmc", "application/x-perfmon"],
      ["pml", ["application/vnd.ctc-posml", "application/x-perfmon"]],
      ["pmr", "application/x-perfmon"],
      ["pmw", "application/x-perfmon"],
      ["png", "image/png"],
      ["pnm", ["application/x-portable-anymap", "image/x-portable-anymap"]],
      ["portpkg", "application/vnd.macports.portpkg"],
      ["pot", ["application/vnd.ms-powerpoint", "application/mspowerpoint"]],
      ["potm", "application/vnd.ms-powerpoint.template.macroenabled.12"],
      ["potx", "application/vnd.openxmlformats-officedocument.presentationml.template"],
      ["pov", "model/x-pov"],
      ["ppa", "application/vnd.ms-powerpoint"],
      ["ppam", "application/vnd.ms-powerpoint.addin.macroenabled.12"],
      ["ppd", "application/vnd.cups-ppd"],
      ["ppm", "image/x-portable-pixmap"],
      ["pps", ["application/vnd.ms-powerpoint", "application/mspowerpoint"]],
      ["ppsm", "application/vnd.ms-powerpoint.slideshow.macroenabled.12"],
      ["ppsx", "application/vnd.openxmlformats-officedocument.presentationml.slideshow"],
      ["ppt", ["application/vnd.ms-powerpoint", "application/mspowerpoint", "application/powerpoint", "application/x-mspowerpoint"]],
      ["pptm", "application/vnd.ms-powerpoint.presentation.macroenabled.12"],
      ["pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
      ["ppz", "application/mspowerpoint"],
      ["prc", "application/x-mobipocket-ebook"],
      ["pre", ["application/vnd.lotus-freelance", "application/x-freelance"]],
      ["prf", "application/pics-rules"],
      ["prt", "application/pro_eng"],
      ["ps", "application/postscript"],
      ["psb", "application/vnd.3gpp.pic-bw-small"],
      ["psd", ["application/octet-stream", "image/vnd.adobe.photoshop"]],
      ["psf", "application/x-font-linux-psf"],
      ["pskcxml", "application/pskc+xml"],
      ["ptid", "application/vnd.pvi.ptid1"],
      ["pub", "application/x-mspublisher"],
      ["pvb", "application/vnd.3gpp.pic-bw-var"],
      ["pvu", "paleovu/x-pv"],
      ["pwn", "application/vnd.3m.post-it-notes"],
      ["pwz", "application/vnd.ms-powerpoint"],
      ["py", "text/x-script.phyton"],
      ["pya", "audio/vnd.ms-playready.media.pya"],
      ["pyc", "application/x-bytecode.python"],
      ["pyv", "video/vnd.ms-playready.media.pyv"],
      ["qam", "application/vnd.epson.quickanime"],
      ["qbo", "application/vnd.intu.qbo"],
      ["qcp", "audio/vnd.qcelp"],
      ["qd3", "x-world/x-3dmf"],
      ["qd3d", "x-world/x-3dmf"],
      ["qfx", "application/vnd.intu.qfx"],
      ["qif", "image/x-quicktime"],
      ["qps", "application/vnd.publishare-delta-tree"],
      ["qt", "video/quicktime"],
      ["qtc", "video/x-qtc"],
      ["qti", "image/x-quicktime"],
      ["qtif", "image/x-quicktime"],
      ["qxd", "application/vnd.quark.quarkxpress"],
      ["ra", ["audio/x-realaudio", "audio/x-pn-realaudio", "audio/x-pn-realaudio-plugin"]],
      ["ram", "audio/x-pn-realaudio"],
      ["rar", "application/x-rar-compressed"],
      ["ras", ["image/cmu-raster", "application/x-cmu-raster", "image/x-cmu-raster"]],
      ["rast", "image/cmu-raster"],
      ["rcprofile", "application/vnd.ipunplugged.rcprofile"],
      ["rdf", "application/rdf+xml"],
      ["rdz", "application/vnd.data-vision.rdz"],
      ["rep", "application/vnd.businessobjects"],
      ["res", "application/x-dtbresource+xml"],
      ["rexx", "text/x-script.rexx"],
      ["rf", "image/vnd.rn-realflash"],
      ["rgb", "image/x-rgb"],
      ["rif", "application/reginfo+xml"],
      ["rip", "audio/vnd.rip"],
      ["rl", "application/resource-lists+xml"],
      ["rlc", "image/vnd.fujixerox.edmics-rlc"],
      ["rld", "application/resource-lists-diff+xml"],
      ["rm", ["application/vnd.rn-realmedia", "audio/x-pn-realaudio"]],
      ["rmi", "audio/mid"],
      ["rmm", "audio/x-pn-realaudio"],
      ["rmp", ["audio/x-pn-realaudio-plugin", "audio/x-pn-realaudio"]],
      ["rms", "application/vnd.jcp.javame.midlet-rms"],
      ["rnc", "application/relax-ng-compact-syntax"],
      ["rng", ["application/ringing-tones", "application/vnd.nokia.ringing-tone"]],
      ["rnx", "application/vnd.rn-realplayer"],
      ["roff", "application/x-troff"],
      ["rp", "image/vnd.rn-realpix"],
      ["rp9", "application/vnd.cloanto.rp9"],
      ["rpm", "audio/x-pn-realaudio-plugin"],
      ["rpss", "application/vnd.nokia.radio-presets"],
      ["rpst", "application/vnd.nokia.radio-preset"],
      ["rq", "application/sparql-query"],
      ["rs", "application/rls-services+xml"],
      ["rsd", "application/rsd+xml"],
      ["rt", ["text/richtext", "text/vnd.rn-realtext"]],
      ["rtf", ["application/rtf", "text/richtext", "application/x-rtf"]],
      ["rtx", ["text/richtext", "application/rtf"]],
      ["rv", "video/vnd.rn-realvideo"],
      ["s", "text/x-asm"],
      ["s3m", "audio/s3m"],
      ["saf", "application/vnd.yamaha.smaf-audio"],
      ["saveme", "application/octet-stream"],
      ["sbk", "application/x-tbook"],
      ["sbml", "application/sbml+xml"],
      ["sc", "application/vnd.ibm.secure-container"],
      ["scd", "application/x-msschedule"],
      ["scm", ["application/vnd.lotus-screencam", "video/x-scm", "text/x-script.guile", "application/x-lotusscreencam", "text/x-script.scheme"]],
      ["scq", "application/scvp-cv-request"],
      ["scs", "application/scvp-cv-response"],
      ["sct", "text/scriptlet"],
      ["scurl", "text/vnd.curl.scurl"],
      ["sda", "application/vnd.stardivision.draw"],
      ["sdc", "application/vnd.stardivision.calc"],
      ["sdd", "application/vnd.stardivision.impress"],
      ["sdkm", "application/vnd.solent.sdkm+xml"],
      ["sdml", "text/plain"],
      ["sdp", ["application/sdp", "application/x-sdp"]],
      ["sdr", "application/sounder"],
      ["sdw", "application/vnd.stardivision.writer"],
      ["sea", ["application/sea", "application/x-sea"]],
      ["see", "application/vnd.seemail"],
      ["seed", "application/vnd.fdsn.seed"],
      ["sema", "application/vnd.sema"],
      ["semd", "application/vnd.semd"],
      ["semf", "application/vnd.semf"],
      ["ser", "application/java-serialized-object"],
      ["set", "application/set"],
      ["setpay", "application/set-payment-initiation"],
      ["setreg", "application/set-registration-initiation"],
      ["sfd-hdstx", "application/vnd.hydrostatix.sof-data"],
      ["sfs", "application/vnd.spotfire.sfs"],
      ["sgl", "application/vnd.stardivision.writer-global"],
      ["sgm", ["text/sgml", "text/x-sgml"]],
      ["sgml", ["text/sgml", "text/x-sgml"]],
      ["sh", ["application/x-shar", "application/x-bsh", "application/x-sh", "text/x-script.sh"]],
      ["shar", ["application/x-bsh", "application/x-shar"]],
      ["shf", "application/shf+xml"],
      ["shtml", ["text/html", "text/x-server-parsed-html"]],
      ["sid", "audio/x-psid"],
      ["sis", "application/vnd.symbian.install"],
      ["sit", ["application/x-stuffit", "application/x-sit"]],
      ["sitx", "application/x-stuffitx"],
      ["skd", "application/x-koan"],
      ["skm", "application/x-koan"],
      ["skp", ["application/vnd.koan", "application/x-koan"]],
      ["skt", "application/x-koan"],
      ["sl", "application/x-seelogo"],
      ["sldm", "application/vnd.ms-powerpoint.slide.macroenabled.12"],
      ["sldx", "application/vnd.openxmlformats-officedocument.presentationml.slide"],
      ["slt", "application/vnd.epson.salt"],
      ["sm", "application/vnd.stepmania.stepchart"],
      ["smf", "application/vnd.stardivision.math"],
      ["smi", ["application/smil", "application/smil+xml"]],
      ["smil", "application/smil"],
      ["snd", ["audio/basic", "audio/x-adpcm"]],
      ["snf", "application/x-font-snf"],
      ["sol", "application/solids"],
      ["spc", ["text/x-speech", "application/x-pkcs7-certificates"]],
      ["spf", "application/vnd.yamaha.smaf-phrase"],
      ["spl", ["application/futuresplash", "application/x-futuresplash"]],
      ["spot", "text/vnd.in3d.spot"],
      ["spp", "application/scvp-vp-response"],
      ["spq", "application/scvp-vp-request"],
      ["spr", "application/x-sprite"],
      ["sprite", "application/x-sprite"],
      ["src", "application/x-wais-source"],
      ["sru", "application/sru+xml"],
      ["srx", "application/sparql-results+xml"],
      ["sse", "application/vnd.kodak-descriptor"],
      ["ssf", "application/vnd.epson.ssf"],
      ["ssi", "text/x-server-parsed-html"],
      ["ssm", "application/streamingmedia"],
      ["ssml", "application/ssml+xml"],
      ["sst", ["application/vnd.ms-pkicertstore", "application/vnd.ms-pki.certstore"]],
      ["st", "application/vnd.sailingtracker.track"],
      ["stc", "application/vnd.sun.xml.calc.template"],
      ["std", "application/vnd.sun.xml.draw.template"],
      ["step", "application/step"],
      ["stf", "application/vnd.wt.stf"],
      ["sti", "application/vnd.sun.xml.impress.template"],
      ["stk", "application/hyperstudio"],
      ["stl", ["application/vnd.ms-pkistl", "application/sla", "application/vnd.ms-pki.stl", "application/x-navistyle"]],
      ["stm", "text/html"],
      ["stp", "application/step"],
      ["str", "application/vnd.pg.format"],
      ["stw", "application/vnd.sun.xml.writer.template"],
      ["sub", "image/vnd.dvb.subtitle"],
      ["sus", "application/vnd.sus-calendar"],
      ["sv4cpio", "application/x-sv4cpio"],
      ["sv4crc", "application/x-sv4crc"],
      ["svc", "application/vnd.dvb.service"],
      ["svd", "application/vnd.svd"],
      ["svf", ["image/vnd.dwg", "image/x-dwg"]],
      ["svg", "image/svg+xml"],
      ["svr", ["x-world/x-svr", "application/x-world"]],
      ["swf", "application/x-shockwave-flash"],
      ["swi", "application/vnd.aristanetworks.swi"],
      ["sxc", "application/vnd.sun.xml.calc"],
      ["sxd", "application/vnd.sun.xml.draw"],
      ["sxg", "application/vnd.sun.xml.writer.global"],
      ["sxi", "application/vnd.sun.xml.impress"],
      ["sxm", "application/vnd.sun.xml.math"],
      ["sxw", "application/vnd.sun.xml.writer"],
      ["t", ["text/troff", "application/x-troff"]],
      ["talk", "text/x-speech"],
      ["tao", "application/vnd.tao.intent-module-archive"],
      ["tar", "application/x-tar"],
      ["tbk", ["application/toolbook", "application/x-tbook"]],
      ["tcap", "application/vnd.3gpp2.tcap"],
      ["tcl", ["text/x-script.tcl", "application/x-tcl"]],
      ["tcsh", "text/x-script.tcsh"],
      ["teacher", "application/vnd.smart.teacher"],
      ["tei", "application/tei+xml"],
      ["tex", "application/x-tex"],
      ["texi", "application/x-texinfo"],
      ["texinfo", "application/x-texinfo"],
      ["text", ["application/plain", "text/plain"]],
      ["tfi", "application/thraud+xml"],
      ["tfm", "application/x-tex-tfm"],
      ["tgz", ["application/gnutar", "application/x-compressed"]],
      ["thmx", "application/vnd.ms-officetheme"],
      ["tif", ["image/tiff", "image/x-tiff"]],
      ["tiff", ["image/tiff", "image/x-tiff"]],
      ["tmo", "application/vnd.tmobile-livetv"],
      ["torrent", "application/x-bittorrent"],
      ["tpl", "application/vnd.groove-tool-template"],
      ["tpt", "application/vnd.trid.tpt"],
      ["tr", "application/x-troff"],
      ["tra", "application/vnd.trueapp"],
      ["trm", "application/x-msterminal"],
      ["tsd", "application/timestamped-data"],
      ["tsi", "audio/tsp-audio"],
      ["tsp", ["application/dsptype", "audio/tsplayer"]],
      ["tsv", "text/tab-separated-values"],
      ["ttf", "application/x-font-ttf"],
      ["ttl", "text/turtle"],
      ["turbot", "image/florian"],
      ["twd", "application/vnd.simtech-mindmapper"],
      ["txd", "application/vnd.genomatix.tuxedo"],
      ["txf", "application/vnd.mobius.txf"],
      ["txt", "text/plain"],
      ["ufd", "application/vnd.ufdl"],
      ["uil", "text/x-uil"],
      ["uls", "text/iuls"],
      ["umj", "application/vnd.umajin"],
      ["uni", "text/uri-list"],
      ["unis", "text/uri-list"],
      ["unityweb", "application/vnd.unity"],
      ["unv", "application/i-deas"],
      ["uoml", "application/vnd.uoml+xml"],
      ["uri", "text/uri-list"],
      ["uris", "text/uri-list"],
      ["ustar", ["application/x-ustar", "multipart/x-ustar"]],
      ["utz", "application/vnd.uiq.theme"],
      ["uu", ["application/octet-stream", "text/x-uuencode"]],
      ["uue", "text/x-uuencode"],
      ["uva", "audio/vnd.dece.audio"],
      ["uvh", "video/vnd.dece.hd"],
      ["uvi", "image/vnd.dece.graphic"],
      ["uvm", "video/vnd.dece.mobile"],
      ["uvp", "video/vnd.dece.pd"],
      ["uvs", "video/vnd.dece.sd"],
      ["uvu", "video/vnd.uvvu.mp4"],
      ["uvv", "video/vnd.dece.video"],
      ["vcd", "application/x-cdlink"],
      ["vcf", "text/x-vcard"],
      ["vcg", "application/vnd.groove-vcard"],
      ["vcs", "text/x-vcalendar"],
      ["vcx", "application/vnd.vcx"],
      ["vda", "application/vda"],
      ["vdo", "video/vdo"],
      ["vew", "application/groupwise"],
      ["vis", "application/vnd.visionary"],
      ["viv", ["video/vivo", "video/vnd.vivo"]],
      ["vivo", ["video/vivo", "video/vnd.vivo"]],
      ["vmd", "application/vocaltec-media-desc"],
      ["vmf", "application/vocaltec-media-file"],
      ["voc", ["audio/voc", "audio/x-voc"]],
      ["vos", "video/vosaic"],
      ["vox", "audio/voxware"],
      ["vqe", "audio/x-twinvq-plugin"],
      ["vqf", "audio/x-twinvq"],
      ["vql", "audio/x-twinvq-plugin"],
      ["vrml", ["model/vrml", "x-world/x-vrml", "application/x-vrml"]],
      ["vrt", "x-world/x-vrt"],
      ["vsd", ["application/vnd.visio", "application/x-visio"]],
      ["vsf", "application/vnd.vsf"],
      ["vst", "application/x-visio"],
      ["vsw", "application/x-visio"],
      ["vtu", "model/vnd.vtu"],
      ["vxml", "application/voicexml+xml"],
      ["w60", "application/wordperfect6.0"],
      ["w61", "application/wordperfect6.1"],
      ["w6w", "application/msword"],
      ["wad", "application/x-doom"],
      ["wav", ["audio/wav", "audio/x-wav"]],
      ["wax", "audio/x-ms-wax"],
      ["wb1", "application/x-qpro"],
      ["wbmp", "image/vnd.wap.wbmp"],
      ["wbs", "application/vnd.criticaltools.wbs+xml"],
      ["wbxml", "application/vnd.wap.wbxml"],
      ["wcm", "application/vnd.ms-works"],
      ["wdb", "application/vnd.ms-works"],
      ["web", "application/vnd.xara"],
      ["weba", "audio/webm"],
      ["webm", "video/webm"],
      ["webp", "image/webp"],
      ["wg", "application/vnd.pmi.widget"],
      ["wgt", "application/widget"],
      ["wiz", "application/msword"],
      ["wk1", "application/x-123"],
      ["wks", "application/vnd.ms-works"],
      ["wm", "video/x-ms-wm"],
      ["wma", "audio/x-ms-wma"],
      ["wmd", "application/x-ms-wmd"],
      ["wmf", ["windows/metafile", "application/x-msmetafile"]],
      ["wml", "text/vnd.wap.wml"],
      ["wmlc", "application/vnd.wap.wmlc"],
      ["wmls", "text/vnd.wap.wmlscript"],
      ["wmlsc", "application/vnd.wap.wmlscriptc"],
      ["wmv", "video/x-ms-wmv"],
      ["wmx", "video/x-ms-wmx"],
      ["wmz", "application/x-ms-wmz"],
      ["woff", "application/x-font-woff"],
      ["word", "application/msword"],
      ["wp", "application/wordperfect"],
      ["wp5", ["application/wordperfect", "application/wordperfect6.0"]],
      ["wp6", "application/wordperfect"],
      ["wpd", ["application/wordperfect", "application/vnd.wordperfect", "application/x-wpwin"]],
      ["wpl", "application/vnd.ms-wpl"],
      ["wps", "application/vnd.ms-works"],
      ["wq1", "application/x-lotus"],
      ["wqd", "application/vnd.wqd"],
      ["wri", ["application/mswrite", "application/x-wri", "application/x-mswrite"]],
      ["wrl", ["model/vrml", "x-world/x-vrml", "application/x-world"]],
      ["wrz", ["model/vrml", "x-world/x-vrml"]],
      ["wsc", "text/scriplet"],
      ["wsdl", "application/wsdl+xml"],
      ["wspolicy", "application/wspolicy+xml"],
      ["wsrc", "application/x-wais-source"],
      ["wtb", "application/vnd.webturbo"],
      ["wtk", "application/x-wintalk"],
      ["wvx", "video/x-ms-wvx"],
      ["x-png", "image/png"],
      ["x3d", "application/vnd.hzn-3d-crossword"],
      ["xaf", "x-world/x-vrml"],
      ["xap", "application/x-silverlight-app"],
      ["xar", "application/vnd.xara"],
      ["xbap", "application/x-ms-xbap"],
      ["xbd", "application/vnd.fujixerox.docuworks.binder"],
      ["xbm", ["image/xbm", "image/x-xbm", "image/x-xbitmap"]],
      ["xdf", "application/xcap-diff+xml"],
      ["xdm", "application/vnd.syncml.dm+xml"],
      ["xdp", "application/vnd.adobe.xdp+xml"],
      ["xdr", "video/x-amt-demorun"],
      ["xdssc", "application/dssc+xml"],
      ["xdw", "application/vnd.fujixerox.docuworks"],
      ["xenc", "application/xenc+xml"],
      ["xer", "application/patch-ops-error+xml"],
      ["xfdf", "application/vnd.adobe.xfdf"],
      ["xfdl", "application/vnd.xfdl"],
      ["xgz", "xgl/drawing"],
      ["xhtml", "application/xhtml+xml"],
      ["xif", "image/vnd.xiff"],
      ["xl", "application/excel"],
      ["xla", ["application/vnd.ms-excel", "application/excel", "application/x-msexcel", "application/x-excel"]],
      ["xlam", "application/vnd.ms-excel.addin.macroenabled.12"],
      ["xlb", ["application/excel", "application/vnd.ms-excel", "application/x-excel"]],
      ["xlc", ["application/vnd.ms-excel", "application/excel", "application/x-excel"]],
      ["xld", ["application/excel", "application/x-excel"]],
      ["xlk", ["application/excel", "application/x-excel"]],
      ["xll", ["application/excel", "application/vnd.ms-excel", "application/x-excel"]],
      ["xlm", ["application/vnd.ms-excel", "application/excel", "application/x-excel"]],
      ["xls", ["application/vnd.ms-excel", "application/excel", "application/x-msexcel", "application/x-excel"]],
      ["xlsb", "application/vnd.ms-excel.sheet.binary.macroenabled.12"],
      ["xlsm", "application/vnd.ms-excel.sheet.macroenabled.12"],
      ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      ["xlt", ["application/vnd.ms-excel", "application/excel", "application/x-excel"]],
      ["xltm", "application/vnd.ms-excel.template.macroenabled.12"],
      ["xltx", "application/vnd.openxmlformats-officedocument.spreadsheetml.template"],
      ["xlv", ["application/excel", "application/x-excel"]],
      ["xlw", ["application/vnd.ms-excel", "application/excel", "application/x-msexcel", "application/x-excel"]],
      ["xm", "audio/xm"],
      ["xml", ["application/xml", "text/xml", "application/atom+xml", "application/rss+xml"]],
      ["xmz", "xgl/movie"],
      ["xo", "application/vnd.olpc-sugar"],
      ["xof", "x-world/x-vrml"],
      ["xop", "application/xop+xml"],
      ["xpi", "application/x-xpinstall"],
      ["xpix", "application/x-vnd.ls-xpix"],
      ["xpm", ["image/xpm", "image/x-xpixmap"]],
      ["xpr", "application/vnd.is-xpr"],
      ["xps", "application/vnd.ms-xpsdocument"],
      ["xpw", "application/vnd.intercon.formnet"],
      ["xslt", "application/xslt+xml"],
      ["xsm", "application/vnd.syncml+xml"],
      ["xspf", "application/xspf+xml"],
      ["xsr", "video/x-amt-showrun"],
      ["xul", "application/vnd.mozilla.xul+xml"],
      ["xwd", ["image/x-xwd", "image/x-xwindowdump"]],
      ["xyz", ["chemical/x-xyz", "chemical/x-pdb"]],
      ["yang", "application/yang"],
      ["yin", "application/yin+xml"],
      ["z", ["application/x-compressed", "application/x-compress"]],
      ["zaz", "application/vnd.zzazz.deck+xml"],
      ["zip", ["application/zip", "multipart/x-zip", "application/x-zip-compressed", "application/x-compressed"]],
      ["zir", "application/vnd.zul"],
      ["zmm", "application/vnd.handheld-entertainment+xml"],
      ["zoo", "application/octet-stream"],
      ["zsh", "text/x-script.zsh"]
    ]);
    function detectMimeType(filename) {
      if (!filename) {
        return defaultMimeType;
      }
      const parsed = node_path_1.default.parse(filename);
      const extension = (parsed.ext.substr(1) || parsed.name || "").split("?").shift().trim().toLowerCase();
      const value = extensions.has(extension) ? extensions.get(extension) : defaultMimeType;
      if (Array.isArray(value)) {
        return value[0];
      }
      return value;
    }
    function detectExtension(mimeType) {
      if (!mimeType) {
        return defaultExtension;
      }
      const parts = mimeType.toLowerCase().trim().split("/");
      const rootType = parts.shift().trim();
      const subType = parts.join("/").trim();
      if (mimeTypes.has(rootType + "/" + subType)) {
        const value = mimeTypes.get(rootType + "/" + subType);
        if (Array.isArray(value)) {
          return value[0];
        }
        return value;
      }
      switch (rootType) {
        case "text":
          return "txt";
        default:
          return "bin";
      }
    }
  }
});

// node_modules/nodemailer/dist/cjs/base64/index.js
var require_base64 = __commonJS({
  "node_modules/nodemailer/dist/cjs/base64/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Encoder = void 0;
    exports2.encode = encode;
    exports2.wrap = wrap;
    var node_stream_1 = require("node:stream");
    function encode(buffer) {
      if (typeof buffer === "string") {
        buffer = Buffer.from(buffer, "utf-8");
      }
      return buffer.toString("base64");
    }
    function normalizeLineLength(lineLength) {
      const length = Math.floor(Number(lineLength));
      return Number.isFinite(length) && length >= 1 ? length : 76;
    }
    function wrapBuffer(src, lineLength, final) {
      const lines = Math.ceil(src.length / lineLength);
      const complete = Math.max(lines - 1, 0);
      let rest = src.length - complete * lineLength;
      const output = Buffer.allocUnsafe(complete * (lineLength + 2) + (final ? rest : 0));
      let to = 0;
      for (let from = 0; from < complete * lineLength; from += lineLength) {
        src.copy(output, to, from, from + lineLength);
        to += lineLength;
        output[to++] = 13;
        output[to++] = 10;
      }
      if (final) {
        to += src.copy(output, to, complete * lineLength);
        rest = 0;
      }
      if (to !== output.length) {
        throw new Error("Unexpected wrapped length");
      }
      return { output, rest };
    }
    function wrap(str2, lineLength) {
      str2 = (str2 || "").toString();
      lineLength = Math.max(Number(lineLength) || 76, 1);
      if (str2.length <= lineLength) {
        return str2;
      }
      const result = [];
      let pos = 0;
      const chunkLength = lineLength * 1024;
      const wrapRegex = new RegExp(".{" + lineLength + "}", "g");
      while (pos < str2.length) {
        const wrappedLines = str2.substr(pos, chunkLength).replace(wrapRegex, "$&\r\n").trim();
        result.push(wrappedLines);
        pos += chunkLength;
      }
      return result.join("\r\n").trim();
    }
    var Encoder = class extends node_stream_1.Transform {
      constructor(options) {
        super();
        this.options = options || {};
        if (this.options.lineLength !== false) {
          this.options.lineLength = normalizeLineLength(this.options.lineLength);
        }
        this._curLine = "";
        this._remainingBytes = false;
        this.inputBytes = 0;
        this.outputBytes = 0;
      }
      /**
       * Emits the encoded characters `b64` that follow the current line, keeping what can not be
       * emitted yet as the new current line
       *
       * @internal
       */
      _emit(b64, final) {
        const src = Buffer.from(this._curLine + b64, "latin1");
        if (!src.length) {
          return;
        }
        let output = src;
        if (this.options.lineLength) {
          const wrapped = wrapBuffer(src, this.options.lineLength, final);
          output = wrapped.output;
          this._curLine = wrapped.rest ? src.toString("latin1", src.length - wrapped.rest) : "";
        } else {
          this._curLine = "";
        }
        if (output.length) {
          this.outputBytes += output.length;
          this.push(output);
        }
      }
      /** @internal */
      _transform(chunk, encoding, done) {
        let buf = encoding !== "buffer" ? Buffer.from(chunk, encoding) : chunk;
        if (!buf || !buf.length) {
          return done();
        }
        this.inputBytes += buf.length;
        if (this._remainingBytes) {
          buf = Buffer.concat([this._remainingBytes, buf], this._remainingBytes.length + buf.length);
          this._remainingBytes = false;
        }
        const extra = buf.length % 3;
        if (extra) {
          this._remainingBytes = buf.subarray(buf.length - extra);
          buf = buf.subarray(0, buf.length - extra);
        }
        this._emit(encode(buf), false);
        done();
      }
      /** @internal */
      _flush(done) {
        this._emit(this._remainingBytes ? encode(this._remainingBytes) : "", true);
        this._remainingBytes = false;
        done();
      }
    };
    exports2.Encoder = Encoder;
  }
});

// node_modules/nodemailer/dist/cjs/qp/index.js
var require_qp = __commonJS({
  "node_modules/nodemailer/dist/cjs/qp/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Encoder = void 0;
    exports2.encode = encode;
    exports2.wrap = wrap;
    var node_stream_1 = require("node:stream");
    var MIN_LINE_LENGTH = 4;
    var QP_RANGES = [
      [9],
      // <TAB>
      [10],
      // <LF>
      [13],
      // <CR>
      [32, 60],
      // <SP>!"#$%&'()*+,-./0123456789:;
      [62, 126]
      // >?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}
    ];
    var QP_LITERAL = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      QP_LITERAL[i] = checkRanges(i, QP_RANGES) ? 1 : 0;
    }
    var HEX_DIGITS = Buffer.from("0123456789ABCDEF", "latin1");
    var isWhitespace = (c) => c === 32 || c === 9;
    function encode(buffer) {
      return encodeBytes(typeof buffer === "string" ? Buffer.from(buffer, "utf-8") : buffer);
    }
    function encodeBytes(buffer, next, binary, previous) {
      const len = buffer.length;
      const output = Buffer.allocUnsafe(len * 3);
      let pos = 0;
      for (let i = 0; i < len; i++) {
        const ord = buffer[i];
        const following = i + 1 < len ? buffer[i + 1] : next;
        const lineBreakByte = binary && (ord === 13 || ord === 10) ? ord === 13 ? following === 10 : (i > 0 ? buffer[i - 1] : previous) === 13 : true;
        if (QP_LITERAL[ord] && lineBreakByte && !(isWhitespace(ord) && (following === void 0 || following === 10 || following === 13))) {
          output[pos++] = ord;
          continue;
        }
        output[pos++] = 61;
        output[pos++] = HEX_DIGITS[Math.floor(ord / 16)];
        output[pos++] = HEX_DIGITS[ord % 16];
      }
      return output.toString("latin1", 0, pos);
    }
    function wrap(str2, lineLength) {
      str2 = (str2 || "").toString();
      lineLength = Math.max(Number(lineLength) || 76, MIN_LINE_LENGTH);
      if (str2.length <= lineLength) {
        return str2;
      }
      let pos = 0;
      const len = str2.length;
      let match, code, line;
      const lineMargin = Math.floor(lineLength / 3);
      let result = "";
      while (pos < len) {
        line = str2.substr(pos, lineLength);
        if (match = line.match(/\r\n/)) {
          line = line.substr(0, match.index + match[0].length);
          result += line;
          pos += line.length;
          continue;
        }
        if (line.substr(-1) === "\n") {
          result += line;
          pos += line.length;
          continue;
        }
        if (match = line.substr(-lineMargin).match(/\n.*?$/)) {
          line = line.substr(0, line.length - (match[0].length - 1));
          result += line;
          pos += line.length;
          continue;
        }
        if (line.length > lineLength - lineMargin && (match = line.substr(-lineMargin).match(/[ \t.,!?][^ \t.,!?]*$/))) {
          line = line.substr(0, line.length - (match[0].length - 1));
        } else if (line.match(/[=][\da-f]{0,2}$/i)) {
          if (match = line.match(/[=][\da-f]{0,1}$/i)) {
            line = line.substr(0, line.length - match[0].length);
          }
          while (line.length > 3 && line.length < len - pos && !line.match(/^(?:=[\da-f]{2}){1,4}$/i) && (match = line.match(/[=][\da-f]{2}$/gi))) {
            code = parseInt(match[0].substr(1, 2), 16);
            if (code < 128) {
              break;
            }
            line = line.substr(0, line.length - 3);
            if (code >= 192) {
              break;
            }
          }
        }
        if (!line.length) {
          line = str2.substr(pos, lineLength);
        }
        if (pos + line.length < len && line.substr(-1) !== "\n") {
          if (line.length === lineLength && line.match(/[=][\da-f]{2}$/i)) {
            line = line.substr(0, line.length - 3);
          } else if (line.length === lineLength) {
            line = line.substr(0, line.length - 1);
          }
          pos += line.length;
          line += "=\r\n";
        } else {
          pos += line.length;
        }
        result += line;
      }
      return result;
    }
    function checkRanges(nr, ranges) {
      for (let i = ranges.length - 1; i >= 0; i--) {
        const range = ranges[i];
        if (!range.length) {
          continue;
        }
        if (range.length === 1 && nr === range[0]) {
          return true;
        }
        if (range.length === 2 && nr >= range[0] && nr <= range[1]) {
          return true;
        }
      }
      return false;
    }
    var ENCODE_SLICE_SIZE = 64 * 1024;
    var Encoder = class extends node_stream_1.Transform {
      constructor(options) {
        super();
        this.options = options || {};
        if (this.options.lineLength !== false) {
          this.options.lineLength = this.options.lineLength || 76;
        }
        this._curLine = "";
        this._remainingBytes = false;
        this._lastByte = void 0;
        this.inputBytes = 0;
        this.outputBytes = 0;
      }
      /** @internal */
      _transform(chunk, encoding, done) {
        let buf = encoding !== "buffer" ? Buffer.from(chunk, encoding) : chunk;
        if (!buf || !buf.length) {
          return done();
        }
        this.inputBytes += buf.length;
        if (this._remainingBytes) {
          buf = Buffer.concat([this._remainingBytes, buf], this._remainingBytes.length + buf.length);
          this._remainingBytes = false;
        }
        let end = buf.length;
        while (end > 0 && (isWhitespace(buf[end - 1]) || this.options.binary && buf[end - 1] === 13)) {
          end--;
        }
        if (buf.length - end <= ENCODE_SLICE_SIZE) {
          this._remainingBytes = end < buf.length ? Buffer.from(buf.subarray(end)) : false;
          buf = buf.subarray(0, end);
        }
        this._encodeSlices(buf);
        done();
      }
      /** @internal */
      _flush(done) {
        if (this._remainingBytes) {
          this._encodeSlices(this._remainingBytes);
          this._remainingBytes = false;
        }
        if (this._curLine) {
          this.outputBytes += this._curLine.length;
          this.push(this._curLine, "ascii");
          this._curLine = "";
        }
        done();
      }
      /**
       * Encodes the input in slices of ENCODE_SLICE_SIZE bytes. Each slice is told the byte that
       * follows it, so a slice that ends in whitespace is encoded as if it was not split
       *
       * @internal
       */
      _encodeSlices(buf) {
        for (let start = 0; start < buf.length; start += ENCODE_SLICE_SIZE) {
          const end = Math.min(start + ENCODE_SLICE_SIZE, buf.length);
          this._encodeSlice(buf.subarray(start, end), end < buf.length ? buf[end] : void 0);
          this._lastByte = buf[end - 1];
        }
      }
      /** @internal */
      _encodeSlice(buf, next) {
        let qp;
        if (this.options.lineLength) {
          qp = wrap(this._curLine + encodeBytes(buf, next, this.options.binary, this._lastByte), this.options.lineLength);
          const lastLF = qp.lastIndexOf("\n");
          this._curLine = qp.substring(lastLF + 1);
          qp = qp.substring(0, lastLF + 1);
          if (qp) {
            this.outputBytes += qp.length;
            this.push(qp, "ascii");
          }
        } else {
          qp = encodeBytes(buf, next, this.options.binary, this._lastByte);
          this.outputBytes += qp.length;
          this.push(qp, "ascii");
        }
      }
    };
    exports2.Encoder = Encoder;
  }
});

// node_modules/nodemailer/dist/cjs/mime-funcs/index.js
var require_mime_funcs = __commonJS({
  "node_modules/nodemailer/dist/cjs/mime-funcs/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isPlainText = isPlainText;
    exports2.quoteString = quoteString;
    exports2.hasLongerLines = hasLongerLines;
    exports2.encodeWord = encodeWord;
    exports2.encodeWords = encodeWords;
    exports2.buildHeaderValue = buildHeaderValue;
    exports2.buildHeaderParam = buildHeaderParam;
    exports2.parseHeaderValue = parseHeaderValue;
    exports2.detectExtension = detectExtension;
    exports2.detectMimeType = detectMimeType;
    exports2.foldLines = foldLines;
    exports2.splitMimeEncodedString = splitMimeEncodedString;
    exports2.encodeURICharComponent = encodeURICharComponent;
    exports2.safeEncodeURIComponent = safeEncodeURIComponent;
    var base64 = __importStar(require_base64());
    var qp = __importStar(require_qp());
    var mimeTypes = __importStar(require_mime_types());
    var objects_js_1 = require_objects();
    function isPlainText(value, isParam) {
      const re = isParam ? /[\x00-\x1f\x7f"\u0080-\uFFFF]/ : /[\x00-\x08\x0b\x0c\x0e-\x1f\u0080-\uFFFF]/;
      return typeof value === "string" && !re.test(value);
    }
    function isPlainParamValue(value) {
      return isPlainText(value, true) && !value.includes("=?");
    }
    function quoteString(value) {
      return '"' + (value || "").toString().replace(/["\\]/g, "\\$&") + '"';
    }
    function hasLongerLines(str2, lineLength) {
      if (str2.length > 128 * 1024) {
        return true;
      }
      return new RegExp("^.{" + (lineLength + 1) + ",}", "m").test(str2);
    }
    function encodeWord(data, mimeWordEncoding, maxLength) {
      mimeWordEncoding = (mimeWordEncoding || "Q").toString().toUpperCase().trim().charAt(0);
      maxLength = maxLength || 0;
      let encodedStr;
      const toCharset = "UTF-8";
      if (maxLength && maxLength > 7 + toCharset.length) {
        maxLength -= 7 + toCharset.length;
      }
      if (mimeWordEncoding === "Q") {
        encodedStr = qp.encode(data).replace(/[^a-z0-9!*+\-/=]/gi, (chr) => {
          const ord = chr.charCodeAt(0).toString(16).toUpperCase();
          if (chr === " ") {
            return "_";
          }
          return "=" + (ord.length === 1 ? "0" + ord : ord);
        });
      } else if (mimeWordEncoding === "B") {
        encodedStr = typeof data === "string" ? data : data.toString("utf-8");
        maxLength = maxLength ? Math.max(3, (maxLength - maxLength % 4) / 4 * 3) : 0;
      }
      if (maxLength && (mimeWordEncoding !== "B" ? encodedStr : base64.encode(data)).length > maxLength) {
        if (mimeWordEncoding === "Q") {
          encodedStr = splitMimeEncodedString(encodedStr, maxLength).join("?= =?" + toCharset + "?" + mimeWordEncoding + "?");
        } else {
          const parts = [];
          let lpart = "";
          for (let i = 0, len = encodedStr.length; i < len; i++) {
            let chr = encodedStr.charAt(i);
            if (/[\ud800-\udbff]/.test(chr) && /[\udc00-\udfff]/.test(encodedStr.charAt(i + 1))) {
              chr += encodedStr.charAt(++i);
            }
            if (Buffer.byteLength(lpart + chr) <= maxLength || i === 0) {
              lpart += chr;
            } else {
              parts.push(base64.encode(lpart));
              lpart = chr;
            }
          }
          if (lpart) {
            parts.push(base64.encode(lpart));
          }
          if (parts.length > 1) {
            encodedStr = parts.join("?= =?" + toCharset + "?" + mimeWordEncoding + "?");
          } else {
            encodedStr = parts.join("");
          }
        }
      } else if (mimeWordEncoding === "B") {
        encodedStr = base64.encode(data);
      }
      return "=?" + toCharset + "?" + mimeWordEncoding + "?" + encodedStr + (encodedStr.substr(-2) === "?=" ? "" : "?=");
    }
    function encodeWords(value, mimeWordEncoding, maxLength, encodeAll) {
      maxLength = maxLength || 0;
      let firstSpecial = -1;
      let lastSpecial = -1;
      for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (code === 34 || code >= 128) {
          if (firstSpecial < 0) {
            firstSpecial = i;
          }
          lastSpecial = i;
        }
      }
      if (firstSpecial < 0) {
        return value;
      }
      if (encodeAll) {
        return encodeWord(value, mimeWordEncoding, maxLength);
      }
      let startIndex = firstSpecial;
      while (startIndex > 0 && !/\s/.test(value.charAt(startIndex - 1))) {
        startIndex--;
      }
      let endIndex = lastSpecial + 1;
      while (endIndex < value.length && !/\s/.test(value.charAt(endIndex))) {
        endIndex++;
      }
      return (startIndex ? value.substr(0, startIndex) : "") + encodeWord(value.substring(startIndex, endIndex), mimeWordEncoding || "Q", maxLength) + (endIndex < value.length ? value.substr(endIndex) : "");
    }
    function buildHeaderValue(structured) {
      const paramsArray = [];
      Object.keys(structured.params || {}).forEach((key) => {
        const value2 = structured.params[key];
        const param = key.replace(/[\x00-\x1f\x7f]/g, "");
        if (!isPlainParamValue(value2) || value2.length >= 75) {
          buildHeaderParam(param, value2, 50).forEach((encodedParam) => {
            if (!/[\s"\\;:/=(),<>@[\]?]|^[-']|'$/.test(encodedParam.value) || encodedParam.key.substr(-1) === "*") {
              paramsArray.push(encodedParam.key + "=" + encodedParam.value);
            } else {
              paramsArray.push(encodedParam.key + "=" + JSON.stringify(encodedParam.value));
            }
          });
        } else if (!value2.length || /[\s'"\\;:/=(),<>@[\]?]|^-/.test(value2)) {
          paramsArray.push(param + "=" + JSON.stringify(value2));
        } else {
          paramsArray.push(param + "=" + value2);
        }
      });
      const value = typeof structured.value === "string" ? structured.value.replace(/[\x00-\x1f\x7f]/g, "") : structured.value;
      return value + (paramsArray.length ? "; " + paramsArray.join("; ") : "");
    }
    function buildHeaderParam(key, data, maxLength) {
      const list = [];
      let encodedStr = typeof data === "string" ? data : (data || "").toString();
      let chr;
      let line;
      let startPos = 0;
      let i, len;
      maxLength = maxLength || 50;
      if (isPlainParamValue(data)) {
        if (encodedStr.length <= maxLength) {
          return [
            {
              key,
              value: encodedStr
            }
          ];
        }
        encodedStr = encodedStr.replace(new RegExp(".{" + maxLength + "}", "g"), (str2) => {
          list.push({
            line: str2
          });
          return "";
        });
        if (encodedStr) {
          list.push({
            line: encodedStr
          });
        }
      } else {
        if (/[\uD800-\uDBFF]/.test(encodedStr)) {
          const encodedStrArr = [];
          for (i = 0, len = encodedStr.length; i < len; i++) {
            chr = encodedStr.charAt(i);
            if (/[\ud800-\udbff]/.test(chr) && /[\udc00-\udfff]/.test(encodedStr.charAt(i + 1))) {
              chr += encodedStr.charAt(i + 1);
              encodedStrArr.push(chr);
              i++;
            } else {
              encodedStrArr.push(chr);
            }
          }
          encodedStr = encodedStrArr;
        }
        line = "utf-8''";
        let encoded = true;
        startPos = 0;
        for (i = 0, len = encodedStr.length; i < len; i++) {
          chr = encodedStr[i];
          if (encoded) {
            chr = safeEncodeURIComponent(chr);
          } else {
            chr = chr === " " ? chr : safeEncodeURIComponent(chr);
            if (chr !== encodedStr[i]) {
              if ((safeEncodeURIComponent(line) + chr).length >= maxLength) {
                list.push({
                  line,
                  encoded
                });
                line = "";
                encoded = true;
              } else {
                encoded = true;
                i = startPos;
                line = "";
                continue;
              }
            }
          }
          if ((line + chr).length >= maxLength) {
            list.push({
              line,
              encoded
            });
            line = chr = encodedStr[i] === " " ? " " : safeEncodeURIComponent(encodedStr[i]);
            if (chr === encodedStr[i]) {
              encoded = false;
              startPos = i - 1;
            } else {
              encoded = true;
            }
          } else {
            line += chr;
          }
        }
        if (line) {
          list.push({
            line,
            encoded
          });
        }
      }
      return list.map((item, i2) => ({
        // encoded lines: {name}*{part}*
        // unencoded lines: {name}*{part}
        // if any line needs to be encoded then the first line (part==0) is always encoded
        key: key + "*" + i2 + (item.encoded ? "*" : ""),
        value: item.line
      }));
    }
    var TOKEN = /^[^\x00-\x20\x7f()<>@,;:\\"/[\]?=]+$/;
    function _findCommentEnd(str2, start) {
      let depth = 0;
      for (let i = start, len = str2.length; i < len; i++) {
        const c = str2.charAt(i);
        if (c === "\\") {
          i++;
        } else if (c === "(") {
          depth++;
        } else if (c === ")" && --depth === 0) {
          return i;
        }
      }
      return -1;
    }
    function _isParamName(name) {
      return !!name && !(0, objects_js_1.isProtoKey)(name);
    }
    function parseHeaderValue(str2, options) {
      const response = {
        value: "",
        params: {}
      };
      let stripComments = !!options?.stripComments;
      const setParam = (name, value2) => {
        name = name.toLowerCase();
        if (_isParamName(name) && !Object.prototype.hasOwnProperty.call(response.params, name)) {
          response.params[name] = value2;
        }
      };
      let key = false;
      let value = "";
      let stage = "value";
      let quote = false;
      let escaped = false;
      let chr;
      let pendingSpace = "";
      let quoteClosed = false;
      const flushSpace = () => {
        if (value.length) {
          value += pendingSpace;
        }
        pendingSpace = "";
      };
      const addChr = (c) => {
        flushSpace();
        value += c;
      };
      const takeValue = () => {
        const taken = value;
        value = "";
        pendingSpace = "";
        quoteClosed = false;
        return taken;
      };
      const storeValue = () => {
        const taken = takeValue();
        if (key === false) {
          response.value = taken;
        } else {
          setParam(key, taken);
        }
      };
      const storeEmptyKey = () => {
        setParam(takeValue().trim(), "");
      };
      for (let i = 0, len = str2.length; i < len; i++) {
        chr = str2.charAt(i);
        if (stripComments && chr === "(" && !quote && !quoteClosed && !(stage === "value" && key !== false && !pendingSpace)) {
          let end = _findCommentEnd(str2, i);
          if (end < 0 && str2.indexOf(";", i) < 0) {
            end = len - 1;
          }
          if (end >= 0) {
            i = end;
            continue;
          }
          stripComments = false;
        }
        if (stage === "key") {
          if (chr === "=") {
            key = takeValue().trim();
            stage = "value";
            continue;
          }
          if (chr === ";") {
            storeEmptyKey();
            continue;
          }
          value += chr;
        } else {
          if (quoteClosed && chr !== ";") {
            escaped = false;
            continue;
          }
          if (escaped) {
            addChr(chr);
          } else if (quote && chr === "\\") {
            escaped = true;
            continue;
          } else if (quote && chr === quote) {
            quote = false;
            quoteClosed = true;
          } else if (!quote && chr === '"') {
            quote = chr;
            flushSpace();
          } else if (!quote && chr === ";") {
            storeValue();
            stage = "key";
          } else if (!quote && (chr === " " || chr === "	")) {
            pendingSpace += chr;
          } else {
            addChr(chr);
          }
          escaped = false;
        }
      }
      if (stage === "value") {
        storeValue();
      } else {
        storeEmptyKey();
      }
      const continuations = /* @__PURE__ */ new Map();
      Object.keys(response.params).forEach((key2) => {
        const match = key2.match(/(\*(\d+)|\*(\d+)\*|\*)$/);
        if (!match) {
          return;
        }
        const actualKey = key2.substr(0, match.index);
        const nr = Number(match[2] || match[3]) || 0;
        const encoded = match[0].substr(-1) === "*";
        let value2 = response.params[key2];
        delete response.params[key2];
        if (!_isParamName(actualKey)) {
          return;
        }
        let continuation = continuations.get(actualKey);
        if (!continuation) {
          continuation = { charset: false, sections: [] };
          continuations.set(actualKey, continuation);
        }
        const charsetMatch = nr === 0 && encoded ? value2.match(/^([^']*)'[^']*'(.*)$/) : null;
        if (charsetMatch) {
          continuation.charset = TOKEN.test(charsetMatch[1]) ? charsetMatch[1] : "iso-8859-1";
          value2 = charsetMatch[2];
        }
        continuation.sections.push({ nr, value: value2, encoded });
      });
      continuations.forEach((continuation, key2) => {
        if (Object.prototype.hasOwnProperty.call(response.params, key2)) {
          return;
        }
        continuation.sections.sort((a, b) => a.nr - b.nr);
        if (!continuation.charset) {
          response.params[key2] = continuation.sections.map((section) => section.value).join("");
          return;
        }
        response.params[key2] = "=?" + continuation.charset + "?Q?" + continuation.sections.map(_encodeContinuationSection).join("") + "?=";
      });
      return response;
    }
    function _encodeContinuationSection(section) {
      const specials = section.encoded ? /[=?_\s]/g : /[=?_\s%]/g;
      return section.value.replace(specials, (s) => {
        const c = s.charCodeAt(0).toString(16);
        if (s === " ") {
          return "_";
        }
        return "%" + (c.length < 2 ? "0" : "") + c;
      }).replace(/%/g, "=");
    }
    function detectExtension(mimeType) {
      return mimeTypes.detectExtension(mimeType);
    }
    function detectMimeType(extension) {
      return mimeTypes.detectMimeType(extension);
    }
    function foldLines(str2, lineLength, afterSpace) {
      str2 = (str2 || "").toString();
      lineLength = lineLength || 76;
      let pos = 0;
      const len = str2.length;
      let result = "";
      let line, match;
      while (pos < len) {
        line = str2.substr(pos, lineLength);
        if (line.length < lineLength) {
          result += line;
          break;
        }
        if (match = line.match(/^[^\n\r]*(\r?\n|\r)/)) {
          line = match[0];
          result += line;
          pos += line.length;
          continue;
        } else if ((match = line.match(/(\s+)[^\s]*$/)) && match[0].length - (afterSpace ? (match[1] || "").length : 0) < line.length) {
          line = line.substr(0, line.length - (match[0].length - (afterSpace ? (match[1] || "").length : 0)));
        } else if (match = str2.substr(pos + line.length).match(/^[^\s]+(\s*)/)) {
          line = line + match[0].substr(0, match[0].length - (!afterSpace ? (match[1] || "").length : 0));
        }
        result += line;
        pos += line.length;
        if (pos < len) {
          result += "\r\n";
        }
      }
      return result;
    }
    function splitMimeEncodedString(str2, maxlen) {
      const lines = [];
      let curLine, fallbackLine, match, chr, done;
      maxlen = Math.max(maxlen || 0, 12);
      while (str2.length) {
        curLine = str2.substr(0, maxlen);
        if (match = curLine.match(/[=][0-9A-F]?$/i)) {
          curLine = curLine.substr(0, match.index);
        }
        fallbackLine = curLine.length ? curLine : str2.substr(0, maxlen);
        done = false;
        while (!done && curLine.length) {
          done = true;
          if (match = str2.substr(curLine.length).match(/^[=]([0-9A-F]{2})/i)) {
            chr = parseInt(match[1], 16);
            if (chr < 194 && chr > 127) {
              curLine = curLine.substr(0, curLine.length - 3);
              done = false;
            }
          }
        }
        if (!curLine.length) {
          curLine = fallbackLine;
        }
        lines.push(curLine);
        str2 = str2.substr(curLine.length);
      }
      return lines;
    }
    function encodeURICharComponent(chr) {
      let res = "";
      let ord = chr.charCodeAt(0).toString(16).toUpperCase();
      if (ord.length % 2) {
        ord = "0" + ord;
      }
      if (ord.length > 2) {
        for (let i = 0, len = ord.length / 2; i < len; i++) {
          res += "%" + ord.substr(i, 2);
        }
      } else {
        res += "%" + ord;
      }
      return res;
    }
    function safeEncodeURIComponent(str2) {
      str2 = (str2 || "").toString();
      try {
        str2 = encodeURIComponent(str2);
      } catch (_E) {
        str2 = encodeURIComponent(Buffer.from(str2, "utf-8").toString("utf-8"));
      }
      return str2.replace(/[\x00-\x1F *'()<>@,;:\\"[\]?=\u007F-\uFFFF]/g, (chr) => encodeURICharComponent(chr));
    }
  }
});

// node_modules/nodemailer/dist/cjs/addressparser/index.js
var require_addressparser = __commonJS({
  "node_modules/nodemailer/dist/cjs/addressparser/index.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var TOKEN_OPERATOR = 1;
    var TOKEN_NO_BREAK = 2;
    var TOKEN_DIRTY = 4;
    var TOKEN_ESCAPES = 8;
    var TOKEN_STARTS_ESCAPED = 16;
    var TokenList = class {
      constructor(str2) {
        this.str = str2;
        this.slots = new Int32Array(48);
        this.length = 0;
        this.cleaned = /* @__PURE__ */ new Map();
      }
      /**
       * Appends a token
       *
       * @param kind Kind and flags of the token
       * @param start Offset of its first character
       * @param end Offset just past its last character
       * @return Index of the token
       */
      push(kind, start, end) {
        if ((this.length + 1) * 3 > this.slots.length) {
          const grown = new Int32Array(this.slots.length * 2);
          grown.set(this.slots);
          this.slots = grown;
        }
        const at = this.length * 3;
        this.slots[at] = kind;
        this.slots[at + 1] = start;
        this.slots[at + 2] = end;
        return this.length++;
      }
      /**
       * The character of an operator token, an empty string for a text run
       */
      operatorAt(index) {
        const at = index * 3;
        return this.slots[at] & TOKEN_OPERATOR ? this.str.charAt(this.slots[at + 1]) : "";
      }
      /**
       * Whether a token is an operator
       */
      isOperator(index) {
        return (this.slots[index * 3] & TOKEN_OPERATOR) !== 0;
      }
      /**
       * Whether the next character continues the run of a token without whitespace in between
       */
      noBreak(index) {
        return (this.slots[index * 3] & TOKEN_NO_BREAK) !== 0;
      }
      /**
       * Value of a token
       */
      value(index) {
        const cleaned = this.cleaned.get(index);
        if (cleaned !== void 0) {
          return cleaned;
        }
        return this.str.slice(this.slots[index * 3 + 1], this.slots[index * 3 + 2]);
      }
    };
    var DOMAIN_LITERAL_TAIL = /@(\[[^[\]\\]*\])$/;
    function _domainAt(address) {
      const literal = address.charAt(address.length - 1) === "]" ? DOMAIN_LITERAL_TAIL.exec(address) : null;
      return literal ? address.length - literal[1].length - 1 : address.lastIndexOf("@");
    }
    function _quoteLocalPart(address) {
      const lastAt = _domainAt(address);
      if (lastAt < 0) {
        return address;
      }
      const user = address.substr(0, lastAt);
      if (/^[^\s"(),:;<>@[\\\]]+$/.test(user) || /^"(?:[^"\\]|\\[\s\S])*"$/.test(user)) {
        return address;
      }
      return '"' + user.replace(/["\\]/g, "\\$&") + '"@' + address.substr(lastAt + 1);
    }
    var HAS_WHITESPACE = /\s/;
    var QUOTED_LOCAL_ADDR = /^("(?:[^"\\]|\\[\s\S])*"@\S+)(?:\s+([\s\S]+))?$/;
    var ADDR_SPEC = /^[^@\s]+@[^@\s]+$/;
    var LITERAL_ADDR_SPEC = /^[^@\s]+@\[[^[\]\\\s]*\]$/;
    var QUOTED_LOCAL_DOMAIN = /^@(?:[^@\s"]+|\[[^[\]\\\s]*\])$/;
    function _isAddrSpec(value) {
      return ADDR_SPEC.test(value) || LITERAL_ADDR_SPEC.test(value);
    }
    var LOOSE_ADDR_SPEC = /^[^@\s]+@\S+$/;
    var LOOSE_TEXT_ADDR = /\s*\b[^@\s]+@[^\s]+\b\s*/y;
    function _isSpaceCode(code) {
      return code === 32 || code >= 9 && code <= 13 || code === 160 || code === 5760 || code >= 8192 && code <= 8202 || code === 8232 || code === 8233 || code === 8239 || code === 8287 || code === 12288 || code === 65279;
    }
    function _isWordCode(code) {
      return code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122 || code === 95;
    }
    function _isBoundary(text, at) {
      return _isWordCode(text.charCodeAt(at - 1)) !== _isWordCode(text.charCodeAt(at));
    }
    function _indexOfAt(text, from, to) {
      for (let i = from; i < to; i++) {
        if (text.charCodeAt(i) === 64) {
          return i;
        }
      }
      return -1;
    }
    var LEADING_QUOTED_STRING = /^"(?:[^"\\]|\\[\s\S])*"/;
    function _joinAtSpacing(value, at) {
      if (at < 0) {
        return value;
      }
      let start = at;
      while (start > 0 && _isSpaceCode(value.charCodeAt(start - 1))) {
        start--;
      }
      let end = at + 1;
      while (end < value.length && _isSpaceCode(value.charCodeAt(end))) {
        end++;
      }
      return start === at && end === at + 1 ? value : value.slice(0, start) + "@" + value.slice(end);
    }
    function _collapseAtSpacing(value) {
      const quoted = LEADING_QUOTED_STRING.exec(value);
      if (quoted) {
        let at2 = quoted[0].length;
        while (at2 < value.length && _isSpaceCode(value.charCodeAt(at2))) {
          at2++;
        }
        if (value.charAt(at2) === "@" && value.indexOf("@", at2 + 1) < 0) {
          return _joinAtSpacing(value, at2);
        }
      }
      const at = value.indexOf("@");
      if (at < 0 || value.indexOf("@", at + 1) >= 0 || value.lastIndexOf('"') > at) {
        return value;
      }
      return _joinAtSpacing(value, at);
    }
    function _looseAddressStart(text) {
      const len = text.length;
      let pos = 0;
      while (pos < len) {
        while (pos < len && _isSpaceCode(text.charCodeAt(pos))) {
          pos++;
        }
        if (pos >= len) {
          break;
        }
        const runStart = pos;
        let runEnd = pos;
        while (runEnd < len && !_isSpaceCode(text.charCodeAt(runEnd))) {
          runEnd++;
        }
        let at = _indexOfAt(text, runStart, runEnd);
        if (at >= 0) {
          let lastBoundary = -1;
          for (let k = runEnd; k > runStart; k--) {
            if (_isBoundary(text, k)) {
              lastBoundary = k;
              break;
            }
          }
          let atomStart = runStart;
          while (lastBoundary >= 0 && at >= 0) {
            if (at > atomStart && runEnd > at + 1 && lastBoundary > at + 1) {
              for (let start = atomStart; start < at; start++) {
                if (_isBoundary(text, start)) {
                  if (start > runStart) {
                    return start;
                  }
                  let padded = runStart;
                  while (padded > 0 && _isSpaceCode(text.charCodeAt(padded - 1))) {
                    padded--;
                  }
                  return padded;
                }
              }
            }
            atomStart = at + 1;
            at = _indexOfAt(text, atomStart, runEnd);
          }
        }
        pos = runEnd;
      }
      return -1;
    }
    function _recoverAddrSpec(data) {
      data.address = _collapseAtSpacing(data.address);
      if (!HAS_WHITESPACE.test(data.address)) {
        return;
      }
      let address;
      let rest;
      const quoted = data.address.match(QUOTED_LOCAL_ADDR);
      if (quoted) {
        if (!quoted[2]) {
          return;
        }
        address = quoted[1];
        rest = [quoted[2]];
      } else {
        if (data.address.indexOf('"') >= 0) {
          return;
        }
        const parts = data.address.split(/\s+/);
        let addrIndex = parts.findIndex(_isAddrSpec);
        if (addrIndex < 0) {
          addrIndex = parts.findIndex((part) => LOOSE_ADDR_SPEC.test(part));
        }
        if (addrIndex < 0) {
          return;
        }
        address = parts.splice(addrIndex, 1)[0];
        rest = parts;
      }
      data.address = address;
      data.text = [data.text].concat(rest).filter((part) => part).join(" ");
    }
    function _stripAddressComments(address) {
      const comments = [];
      let result = "";
      let comment = "";
      let depth = 0;
      let closer = "";
      let lastChar = "";
      let pendingSpace = false;
      let firstChar = "";
      let quoteSeen = false;
      let routeEnd = -1;
      for (let i = 0, len = address.length; i < len; i++) {
        const chr = address.charAt(i);
        if (depth) {
          if (chr === "\\" && i < len - 1) {
            comment += address.charAt(++i);
          } else if (chr === "(") {
            depth++;
            comment += chr;
          } else if (chr === ")" && !--depth) {
            comments.push(comment.trim());
            comment = "";
            pendingSpace = lastChar !== "@";
          } else {
            comment += chr;
          }
          continue;
        }
        if (pendingSpace && chr !== "(") {
          pendingSpace = false;
          if (chr !== "@" && chr !== "<" && !_isSpaceCode(address.charCodeAt(i))) {
            result += " ";
            lastChar = " ";
          }
        }
        if (closer) {
          if (chr === "\\" && closer === '"' && i < len - 1) {
            result += chr + address.charAt(++i);
            lastChar = address.charAt(i);
            continue;
          }
          if (chr === closer) {
            closer = "";
          }
        } else if (chr === '"') {
          closer = '"';
          quoteSeen = true;
        } else if (chr === ":" && routeEnd < 0 && firstChar === "@" && !quoteSeen) {
          routeEnd = result.length + 1;
        } else if (chr === "[") {
          closer = "]";
        } else if (chr === "(") {
          depth = 1;
          continue;
        } else if (chr === "<") {
          result = "";
          lastChar = "";
          comments.length = 0;
          firstChar = "";
          quoteSeen = false;
          routeEnd = -1;
          continue;
        }
        result += chr;
        lastChar = chr;
        if (!firstChar && !_isSpaceCode(address.charCodeAt(i))) {
          firstChar = chr;
        }
      }
      if (routeEnd >= 0 && result.indexOf("@", routeEnd) >= 0) {
        result = result.slice(routeEnd);
      }
      if (depth) {
        comments.push(comment.trim());
      }
      return { address: result.trim(), comments: comments.filter((text) => text) };
    }
    function _collectAddressParts(tokens, from, to) {
      let state = "text";
      const data = {
        address: [],
        comment: [],
        text: [],
        textWasQuoted: [],
        quotedLocalAt: []
      };
      let insideQuotes = false;
      let lastTextPureQuoted = false;
      const lastChars = { address: "", comment: "", text: "" };
      for (let i = from; i < to; i++) {
        const value = tokens.value(i);
        const prevOperator = i > from ? tokens.operatorAt(i - 1) : "";
        const prevNoBreak = i > from && tokens.noBreak(i - 1);
        if (tokens.isOperator(i)) {
          switch (value) {
            case "<":
              state = "address";
              insideQuotes = false;
              break;
            case "(":
              state = "comment";
              insideQuotes = false;
              break;
            case '"':
              insideQuotes = !insideQuotes;
              state = "text";
              break;
            default:
              state = "text";
              insideQuotes = false;
              break;
          }
        } else {
          const opensAfterEmptyQuotedString = prevOperator === '"' && prevNoBreak && i > from + 1 && tokens.operatorAt(i - 2) === '"';
          const parts = data[state];
          const joins = prevNoBreak && parts.length && (prevOperator !== ")" || lastChars[state] === "@" || value.charAt(0) === "@");
          if (joins) {
            const last = data[state].length - 1;
            if (state === "text" && !insideQuotes) {
              if (lastTextPureQuoted && value.charAt(0) === "@") {
                data.quotedLocalAt[last] = data.text[last].length;
              }
              lastTextPureQuoted = false;
            }
            data[state][last] += value;
            lastChars[state] = value.charAt(value.length - 1);
            if (state === "text" && insideQuotes) {
              data.textWasQuoted[last] = true;
            }
          } else {
            data[state].push(value);
            lastChars[state] = value.charAt(value.length - 1);
            if (state === "text") {
              data.textWasQuoted.push(insideQuotes || opensAfterEmptyQuotedString);
              data.quotedLocalAt.push(opensAfterEmptyQuotedString && value.charAt(0) === "@" ? 0 : -1);
              lastTextPureQuoted = insideQuotes;
            }
          }
        }
      }
      let textFromComment = false;
      if (!data.text.length && data.comment.length) {
        data.text = data.comment;
        data.comment = [];
        textFromComment = true;
      }
      return { data, textFromComment };
    }
    function _groupName(tokens, from, to) {
      return _collectAddressParts(tokens, from, to).data.text.join(" ");
    }
    function _handleAddress(tokens, from, to) {
      const collected = _collectAddressParts(tokens, from, to);
      const data = collected.data;
      let textFromComment = collected.textFromComment;
      const addressComments = [];
      const addressParts = [];
      for (const part of data.address) {
        const stripped = _stripAddressComments(part);
        for (const comment of stripped.comments) {
          addressComments.push(comment);
        }
        if (stripped.address) {
          addressParts.push(stripped.address);
        }
      }
      data.address = addressParts;
      if (!data.address.length && data.text.length && !textFromComment) {
        const candidates = data.text.map((part) => _collapseAtSpacing(part));
        for (let i = 0; i < data.text.length; i++) {
          const local = data.quotedLocalAt[i];
          const quotedLocal = data.textWasQuoted[i] && local >= 0 && QUOTED_LOCAL_DOMAIN.test(data.text[i].slice(local)) ? _quoteLocalPart(data.text[i]) : "";
          if (quotedLocal || !data.textWasQuoted[i] && _isAddrSpec(candidates[i])) {
            data.address = [quotedLocal || candidates[i]];
            data.text.splice(i, 1);
            data.textWasQuoted.splice(i, 1);
            data.quotedLocalAt.splice(i, 1);
            break;
          }
        }
        if (!data.address.length) {
          let extracted = false;
          for (let i = 0; i < data.text.length; i++) {
            if (!data.textWasQuoted[i]) {
              const part = candidates[i];
              let remainder = data.text[i];
              const at = _looseAddressStart(part);
              if (at >= 0) {
                LOOSE_TEXT_ADDR.lastIndex = at;
                const match = LOOSE_TEXT_ADDR.exec(part);
                if (match) {
                  data.address = [match[0].trim()];
                  extracted = true;
                  remainder = part.slice(0, at) + " " + part.slice(at + match[0].length);
                }
              }
              data.text[i] = remainder.trim();
              if (extracted) {
                break;
              }
            }
          }
        }
      }
      if (!data.text.length && data.comment.length) {
        data.text = data.comment;
        data.comment = [];
      }
      if (data.address.length > 1) {
        data.text = data.text.concat(data.address.splice(1));
      }
      const addressFromQuotedText = !data.address.length && data.textWasQuoted.some((wasQuoted) => wasQuoted);
      data.text = data.text.join(" ");
      data.address = data.address.join(" ");
      if (addressFromQuotedText && data.text.indexOf("@") >= 0) {
        data.address = _quoteLocalPart(_joinAtSpacing(data.text, _domainAt(data.text)));
        data.text = "";
      }
      _recoverAddrSpec(data);
      if (!data.text && addressComments.length) {
        data.text = addressComments.join(" ");
        textFromComment = true;
      }
      const address = {
        address: data.address || (textFromComment ? "" : data.text) || "",
        name: data.text || data.address || ""
      };
      if (address.address === address.name) {
        if (/@/.test(address.address || "")) {
          address.name = "";
        } else {
          address.address = "";
        }
      }
      return address;
    }
    var Tokenizer = class {
      constructor(str2) {
        this.str = (str2 || "").toString();
        this.operatorCurrent = "";
        this.operatorExpecting = "";
        this.node = -1;
        this.escaped = false;
        this.inDomainLiteral = false;
        this.afterAt = false;
        this.inGroup = false;
        this.innerQuoted = false;
        this.innerComment = 0;
        this.innerLiteral = false;
        this.innerEscaped = false;
        this.list = new TokenList(this.str);
        this.operators = {
          '"': '"',
          "(": ")",
          "<": ">",
          ",": "",
          // A group is read in the same pass as the rest of the list, so its ':' only marks
          // where the name ends and its members are tokenized like any other address
          ":": "",
          // Semicolons are not a legal delimiter per the RFC2822 grammar other
          // than for terminating a group, but they are also not valid for any
          // other use in this context.  Given that some mail clients have
          // historically allowed the semicolon as a delimiter equivalent to the
          // comma in their UI, it makes sense to treat them the same as a comma
          // when used outside of a group.
          ";": ""
        };
      }
      /**
       * Tokenizes the original input string
       *
       * @return An array of operator|text tokens
       */
      tokenize() {
        const str2 = this.str;
        const len = str2.length;
        for (let i = 0; i < len; i++) {
          this.checkChar(str2.charAt(i), i);
        }
        this._closeText(len);
        const list = this.list;
        const slots = list.slots;
        let kept = 0;
        for (let i = 0, count = list.length; i < count; i++) {
          const kind = slots[i * 3];
          let start = slots[i * 3 + 1];
          let end = slots[i * 3 + 2];
          if (kind & TOKEN_DIRTY) {
            const value = this._cleanValue(start, end, kind).trim();
            if (!value) {
              continue;
            }
            list.cleaned.set(kept, value);
          } else if (!(kind & TOKEN_OPERATOR)) {
            while (start < end && _isSpaceCode(str2.charCodeAt(start))) {
              start++;
            }
            while (end > start && _isSpaceCode(str2.charCodeAt(end - 1))) {
              end--;
            }
            if (start === end) {
              continue;
            }
          }
          slots[kept * 3] = kind;
          slots[kept * 3 + 1] = start;
          slots[kept * 3 + 2] = end;
          kept++;
        }
        list.length = kept;
        return list;
      }
      /**
       * Ends the text run being collected, if there is one
       *
       * @param end Offset just past its last character
       */
      _closeText(end) {
        if (this.node >= 0) {
          this.list.slots[this.node * 3 + 2] = end;
          this.node = -1;
        }
      }
      /**
       * Rebuilds the value of a text run that is no plain slice of the field, applying the
       * rules checkChar collects characters by: an escaping backslash is dropped, a line break
       * reads as a space and any other control character is left out
       *
       * @param start Offset of the first character of the run
       * @param end Offset just past its last character
       * @param kind Kind and flags of the run
       * @return Value of the run
       */
      _cleanValue(start, end, kind) {
        const str2 = this.str;
        const escapes = (kind & TOKEN_ESCAPES) !== 0;
        let escaped = (kind & TOKEN_STARTS_ESCAPED) !== 0;
        let value = "";
        for (let i = start; i < end; i++) {
          const chr = str2.charAt(i);
          if (escapes && !escaped && chr === "\\") {
            escaped = true;
            continue;
          }
          escaped = false;
          if (chr === "\n") {
            value += " ";
          } else if (chr.charCodeAt(0) >= 33 || chr === " " || chr === "	") {
            value += chr;
          }
        }
        return value;
      }
      /**
       * Checks if a character is an operator or text and acts accordingly
       *
       * @param chr Character from the address field
       * @param i Offset of the character in the field
       */
      checkChar(chr, i) {
        if (!this.escaped && !this.operatorExpecting) {
          if (!this.inDomainLiteral && chr === "[" && this.afterAt) {
            this.inDomainLiteral = true;
          } else if (this.inDomainLiteral && (chr === "]" || chr === "," || chr === ";")) {
            this.inDomainLiteral = false;
          }
        }
        let nested = false;
        if (this.operatorExpecting === ">") {
          nested = this._trackInner(chr);
          if (!nested && chr === ";" && this.inGroup) {
            this._closeText(i);
            this.operatorExpecting = "";
            this._resetInner();
          }
        } else if (this.operatorExpecting === ")" && !this.escaped) {
          if (chr === "(") {
            this.innerComment++;
          } else if (chr === ")" && this.innerComment) {
            this.innerComment--;
            nested = true;
          }
        }
        if (this.escaped) {
        } else if (chr === this.operatorExpecting && !nested) {
          const nextChr = this.str.charAt(i + 1);
          this._closeText(i);
          this.list.push(nextChr && ![" ", "	", "\r", "\n", ",", ";"].includes(nextChr) ? TOKEN_OPERATOR | TOKEN_NO_BREAK : TOKEN_OPERATOR, i, i + 1);
          if (chr !== ")") {
            this.afterAt = false;
          }
          this.operatorExpecting = "";
          this.escaped = false;
          this._resetInner();
          return;
        } else if (!this.operatorExpecting && !(this.inDomainLiteral && chr === ":") && chr in this.operators) {
          this._closeText(i);
          this.list.push(TOKEN_OPERATOR, i, i + 1);
          if (chr === ":") {
            this.inGroup = true;
          } else if (chr === ";") {
            this.inGroup = false;
          }
          if (chr !== "(") {
            this.afterAt = false;
          }
          this.operatorExpecting = this.operators[chr];
          this.escaped = false;
          this._resetInner();
          return;
        } else if (['"', "'", ")"].includes(this.operatorExpecting) && chr === "\\") {
          this.escaped = true;
          if (this.node >= 0) {
            this.list.slots[this.node * 3] |= TOKEN_DIRTY;
          }
          return;
        }
        if (this.node < 0) {
          this.node = this.list.push((this.operatorExpecting === '"' || this.operatorExpecting === ")" ? TOKEN_ESCAPES : 0) | (this.escaped ? TOKEN_STARTS_ESCAPED : 0), i, i);
        }
        if (chr === "\n") {
          chr = " ";
          this.list.slots[this.node * 3] |= TOKEN_DIRTY;
        }
        if (chr.charCodeAt(0) >= 33 || chr === " " || chr === "	") {
          if (!this.operatorExpecting && chr !== " " && chr !== "	") {
            this.afterAt = chr === "@";
          }
        } else {
          this.list.slots[this.node * 3] |= TOKEN_DIRTY;
        }
        this.escaped = false;
      }
      /**
       * Tracks the quoted strings, comments and domain literals inside an angle-addr, which its
       * closer must not be read from. A backslash escapes the next character inside a quoted
       * string and a comment. A domain literal opens right after an "@" and ends at the "]".
       * dtext holds the list separators as well, and inside the brackets they never split the
       * list anyway.
       *
       * @param chr Character from the address field
       * @return true while the character sits inside one of them, the one that closes it included
       */
      _trackInner(chr) {
        if (this.innerEscaped) {
          this.innerEscaped = false;
          return true;
        }
        if (this.innerQuoted) {
          if (chr === "\\") {
            this.innerEscaped = true;
          } else if (chr === '"') {
            this.innerQuoted = false;
          }
          return true;
        }
        if (this.innerComment) {
          if (chr === "\\") {
            this.innerEscaped = true;
          } else if (chr === "(") {
            this.innerComment++;
          } else if (chr === ")") {
            this.innerComment--;
          }
          return true;
        }
        if (this.innerLiteral) {
          if (chr === "]") {
            this.innerLiteral = false;
          }
          return true;
        }
        if (chr === '"') {
          this.innerQuoted = true;
          return true;
        }
        if (chr === "(") {
          this.innerComment = 1;
          return true;
        }
        if (chr === "[" && this.afterAt) {
          this.innerLiteral = true;
          return true;
        }
        if (!_isSpaceCode(chr.charCodeAt(0))) {
          this.afterAt = chr === "@";
        }
        return false;
      }
      /**
       * Forgets the nesting collected for the operator that just opened or ended
       */
      _resetInner() {
        this.innerQuoted = false;
        this.innerComment = 0;
        this.innerLiteral = false;
        this.innerEscaped = false;
      }
    };
    function _mergeNameFragments(list) {
      const merged = [];
      for (let i = list.length - 1; i >= 0; i--) {
        const current = list[i];
        const next = merged.length ? merged[merged.length - 1] : null;
        if (next && current.address === "" && current.name && !current.group && next.address && next.name) {
          next.name = current.name + ", " + next.name;
        } else {
          merged.push(current);
        }
      }
      return merged.reverse();
    }
    function _parseAddressList(str2) {
      const tokens = new Tokenizer(str2).tokenize();
      const parsedAddresses = [];
      let group = null;
      let members = [];
      let from = 0;
      for (let i = 0, len = tokens.length; i <= len; i++) {
        const operator = i < len ? tokens.operatorAt(i) : "";
        if (i < len && operator !== "," && operator !== ";" && operator !== ":") {
          continue;
        }
        if (operator === ":") {
          if (!group) {
            group = { name: _groupName(tokens, from, i), group: [] };
            members = [];
          }
          from = i + 1;
          continue;
        }
        if (i > from) {
          const address = _handleAddress(tokens, from, i);
          if (group) {
            members.push(address);
          } else {
            parsedAddresses.push(address);
          }
        }
        from = i + 1;
        if (group && (operator === ";" || i === len)) {
          group.group = _mergeNameFragments(members);
          parsedAddresses.push(group);
          group = null;
        }
      }
      return _mergeNameFragments(parsedAddresses);
    }
    function addressparser(str2, options) {
      const parsedAddresses = _parseAddressList(str2);
      if (options?.flatten) {
        const flatAddresses = [];
        const walkAddressList = (list) => {
          list.forEach((entry) => {
            if (entry.group) {
              return walkAddressList(entry.group);
            }
            flatAddresses.push(entry);
          });
        };
        walkAddressList(parsedAddresses);
        return flatAddresses;
      }
      return parsedAddresses;
    }
    exports2.default = addressparser;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/mime-node/last-newline.js
var require_last_newline = __commonJS({
  "node_modules/nodemailer/dist/cjs/mime-node/last-newline.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_stream_1 = require("node:stream");
    var LastNewline = class extends node_stream_1.Transform {
      constructor() {
        super();
        this.lastByte = false;
      }
      /** @internal */
      _transform(chunk, encoding, done) {
        if (chunk.length) {
          this.lastByte = chunk[chunk.length - 1];
        }
        this.push(chunk);
        done();
      }
      /** @internal */
      _flush(done) {
        if (this.lastByte === 10) {
          return done();
        }
        if (this.lastByte === 13) {
          this.push(Buffer.from("\n"));
          return done();
        }
        this.push(Buffer.from("\r\n"));
        return done();
      }
    };
    exports2.default = LastNewline;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/mime-node/le-windows.js
var require_le_windows = __commonJS({
  "node_modules/nodemailer/dist/cjs/mime-node/le-windows.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_stream_1 = require("node:stream");
    var LeWindows = class extends node_stream_1.Transform {
      constructor(options) {
        super(options);
        this.lastByte = false;
      }
      /**
       * Escapes dots
       * @internal
       */
      _transform(chunk, encoding, done) {
        let buf;
        let lastPos = 0;
        for (let i = 0, len = chunk.length; i < len; i++) {
          if (chunk[i] === 10) {
            if (i && chunk[i - 1] !== 13 || !i && this.lastByte !== 13) {
              if (i > lastPos) {
                buf = chunk.slice(lastPos, i);
                this.push(buf);
              }
              this.push(Buffer.from("\r\n"));
              lastPos = i + 1;
            }
          }
        }
        if (lastPos && lastPos < chunk.length) {
          buf = chunk.slice(lastPos);
          this.push(buf);
        } else if (!lastPos) {
          this.push(chunk);
        }
        this.lastByte = chunk[chunk.length - 1];
        done();
      }
    };
    exports2.default = LeWindows;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/mime-node/le-unix.js
var require_le_unix = __commonJS({
  "node_modules/nodemailer/dist/cjs/mime-node/le-unix.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_stream_1 = require("node:stream");
    var LeUnix = class extends node_stream_1.Transform {
      constructor(options) {
        super(options);
      }
      /**
       * Escapes dots
       * @internal
       */
      _transform(chunk, encoding, done) {
        let buf;
        let lastPos = 0;
        for (let i = 0, len = chunk.length; i < len; i++) {
          if (chunk[i] === 13) {
            buf = chunk.slice(lastPos, i);
            lastPos = i + 1;
            this.push(buf);
          }
        }
        if (lastPos && lastPos < chunk.length) {
          buf = chunk.slice(lastPos);
          this.push(buf);
        } else if (!lastPos) {
          this.push(chunk);
        }
        done();
      }
    };
    exports2.default = LeUnix;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/mime-node/index.js
var require_mime_node = __commonJS({
  "node_modules/nodemailer/dist/cjs/mime-node/index.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_crypto_1 = __importDefault(require("node:crypto"));
    var node_fs_1 = __importDefault(require("node:fs"));
    var punycode = __importStar(require_punycode());
    var node_stream_1 = require("node:stream");
    var shared = __importStar(require_shared());
    var node_url_1 = __importDefault(require("node:url"));
    var mimeFuncs = __importStar(require_mime_funcs());
    var qp = __importStar(require_qp());
    var base64 = __importStar(require_base64());
    var index_js_1 = __importDefault(require_addressparser());
    var index_js_2 = __importDefault(require_fetch());
    var errors = __importStar(require_errors());
    var last_newline_js_1 = __importDefault(require_last_newline());
    var le_windows_js_1 = __importDefault(require_le_windows());
    var le_unix_js_1 = __importDefault(require_le_unix());
    var FORMATTED_HEADERS = ["From", "Sender", "To", "Cc", "Bcc", "Reply-To", "Date", "References"];
    var ATEXT = "[A-Za-z0-9!#$%&'*+\\-/=?^_`{|}~\\x80-\\uFFFF]";
    var DOT_ATOM = new RegExp("^" + ATEXT + "+(?:\\." + ATEXT + "+)*$");
    var QUOTED_STRING = /^"(?:[^"\\]|\\[\s\S])*"$/;
    var PLAIN_ADDRESS = /^[^\s"(),:;<>@[\\\]]+@[^\s"(),:;<>@[\\\]]+$/;
    var DOMAIN_LITERAL_TAIL = /@(\[[^[\]\\]*\])$/;
    function stripWhitespaceInAngleBrackets(value) {
      let result = "";
      let pos = 0;
      for (; ; ) {
        const open = value.indexOf("<", pos);
        if (open < 0) {
          break;
        }
        const close = value.indexOf(">", open + 1);
        if (close < 0) {
          break;
        }
        result += value.slice(pos, open) + value.slice(open, close + 1).replace(/\s/g, "");
        pos = close + 1;
      }
      return result + value.slice(pos);
    }
    var URL_PARSER_UNSAFE = /[/\\?#%\x00-\x20\x7F]/;
    var MAX_DOMAIN_LENGTH = 253;
    var MAX_LABEL_LENGTH = 63;
    var PIPELINE_NOOP = () => false;
    function abortedError() {
      const err = new Error("Message stream was closed before the message was generated");
      err.code = errors.ESTREAM;
      return err;
    }
    function exceedsDomainLimits(domain) {
      let total = 0;
      let label = 0;
      for (const char of domain) {
        total++;
        if (char === "." || char === "\u3002" || char === "\uFF0E" || char === "\uFF61") {
          label = 0;
        } else if (++label > MAX_LABEL_LENGTH) {
          return true;
        }
      }
      return total > MAX_DOMAIN_LENGTH;
    }
    function normalizeDomain(domain, toUnicode) {
      if (typeof node_url_1.default.domainToASCII === "function" && typeof node_url_1.default.domainToUnicode === "function" && !URL_PARSER_UNSAFE.test(domain)) {
        const ascii = node_url_1.default.domainToASCII(domain);
        const mapped = ascii && toUnicode ? node_url_1.default.domainToUnicode(ascii) : ascii;
        if (mapped) {
          return mapped;
        }
      }
      if (exceedsDomainLimits(domain)) {
        return domain;
      }
      return toUnicode ? punycode.toUnicode(domain) : punycode.toASCII(domain);
    }
    function _stripBoundaryControls(value) {
      return value.replace(/[\x00-\x1f\x7f]+/g, "");
    }
    var MimeNode = class _MimeNode {
      constructor(contentType, options) {
        this.nodeCounter = 0;
        options = options || {};
        this.baseBoundary = _stripBoundaryControls(options.baseBoundary || node_crypto_1.default.randomBytes(8).toString("hex"));
        this.boundaryPrefix = _stripBoundaryControls(options.boundaryPrefix || "--_NmP");
        this.disableFileAccess = !!options.disableFileAccess;
        this.disableUrlAccess = !!options.disableUrlAccess;
        this.normalizeHeaderKey = options.normalizeHeaderKey;
        this.date = options.parentNode ? null : /* @__PURE__ */ new Date();
        this.rootNode = options.rootNode || this;
        this.keepBcc = !!options.keepBcc;
        if (options.filename) {
          this.filename = options.filename;
          if (!contentType) {
            contentType = mimeFuncs.detectMimeType(this.filename.split(".").pop());
          }
        }
        this.textEncoding = (options.textEncoding || "").toString().trim().charAt(0).toUpperCase();
        this.parentNode = options.parentNode;
        this.hostname = options.hostname;
        this.newline = options.newline;
        this.childNodes = [];
        this._nodeId = ++this.rootNode.nodeCounter;
        this._headers = [];
        this._isPlainText = false;
        this._hasLongLines = false;
        this._envelope = false;
        this._raw = false;
        this._transforms = [];
        this._processFuncs = [];
        if (contentType) {
          this.setHeader("Content-Type", contentType);
        }
      }
      /////// PUBLIC METHODS
      /**
       * Creates and appends a child node.Arguments provided are passed to MimeNode constructor
       *
       * @param [contentType] Optional content type
       * @param [options] Optional options object
       * @return Created node object
       */
      createChild(contentType, options) {
        if (!options && typeof contentType === "object") {
          options = contentType;
          contentType = void 0;
        }
        const node = new _MimeNode(contentType, options);
        this.appendChild(node);
        return node;
      }
      /**
       * Appends an existing node to the mime tree. Removes the node from an existing
       * tree if needed
       *
       * @param childNode node to be appended
       * @return Appended node object
       */
      appendChild(childNode) {
        if (childNode.parentNode && childNode.parentNode !== this) {
          childNode.remove();
        }
        if (childNode.rootNode !== this.rootNode) {
          childNode.rootNode = this.rootNode;
          childNode._nodeId = ++this.rootNode.nodeCounter;
        }
        childNode.parentNode = this;
        this.childNodes.push(childNode);
        return childNode;
      }
      /**
       * Replaces current node with another node
       *
       * @param node Replacement node
       * @return Replacement node
       */
      replace(node) {
        if (node === this) {
          return this;
        }
        this.parentNode.childNodes.forEach((childNode, i) => {
          if (childNode === this) {
            node.rootNode = this.rootNode;
            node.parentNode = this.parentNode;
            node._nodeId = this._nodeId;
            this.rootNode = this;
            this.parentNode = void 0;
            node.parentNode.childNodes[i] = node;
          }
        });
        return node;
      }
      /**
       * Removes current node from the mime tree
       *
       * @return removed node
       */
      remove() {
        if (!this.parentNode) {
          return this;
        }
        for (let i = this.parentNode.childNodes.length - 1; i >= 0; i--) {
          if (this.parentNode.childNodes[i] === this) {
            this.parentNode.childNodes.splice(i, 1);
            this.parentNode = void 0;
            this.rootNode = this;
            return this;
          }
        }
      }
      /**
       * Sets a header value. If the value for selected key exists, it is overwritten.
       * You can set multiple values as well by using [{key:'', value:''}] or
       * {key: 'value'} as the first argument.
       *
       * @param key Header key or a list of key value pairs
       * @param value Header value
       * @return current node
       */
      setHeader(key, value) {
        let added = false;
        if (!value && key && typeof key === "object") {
          if (key.key && "value" in key) {
            this.setHeader(key.key, key.value);
          } else if (Array.isArray(key)) {
            key.forEach((i) => {
              this.setHeader(i.key, i.value);
            });
          } else {
            Object.keys(key).forEach((i) => {
              this.setHeader(i, key[i]);
            });
          }
          return this;
        }
        key = this._normalizeHeaderKey(key);
        const headerValue = {
          key,
          value
        };
        for (let i = 0, len = this._headers.length; i < len; i++) {
          if (this._headers[i].key === key) {
            if (!added) {
              this._headers[i] = headerValue;
              added = true;
            } else {
              this._headers.splice(i, 1);
              i--;
              len--;
            }
          }
        }
        if (!added) {
          this._headers.push(headerValue);
        }
        return this;
      }
      /**
       * Adds a header value. If the value for selected key exists, the value is appended
       * as a new field and old one is not touched.
       * You can set multiple values as well by using [{key:'', value:''}] or
       * {key: 'value'} as the first argument.
       *
       * @param key Header key or a list of key value pairs
       * @param value Header value
       * @return current node
       */
      addHeader(key, value) {
        if (!value && key && typeof key === "object") {
          if (key.key && key.value) {
            this.addHeader(key.key, key.value);
          } else if (Array.isArray(key)) {
            key.forEach((i) => {
              this.addHeader(i.key, i.value);
            });
          } else {
            Object.keys(key).forEach((i) => {
              this.addHeader(i, key[i]);
            });
          }
          return this;
        } else if (Array.isArray(value)) {
          value.forEach((val) => {
            this.addHeader(key, val);
          });
          return this;
        }
        this._headers.push({
          key: this._normalizeHeaderKey(key),
          value
        });
        return this;
      }
      /**
       * Retrieves the first mathcing value of a selected key
       *
       * @param key Key to search for
       * @retun Value for the key
       */
      getHeader(key) {
        key = this._normalizeHeaderKey(key);
        for (let i = 0, len = this._headers.length; i < len; i++) {
          if (this._headers[i].key === key) {
            return this._headers[i].value;
          }
        }
      }
      /**
       * Sets body content for current node. If the value is a string, charset is added automatically
       * to Content-Type (if it is text/*). If the value is a Buffer, you need to specify
       * the charset yourself
       *
       * @param content Body content
       * @return current node
       */
      setContent(content) {
        this.content = content;
        if (typeof this.content.pipe === "function") {
          shared.recordStreamErrors(this.content);
        } else if (typeof this.content === "string") {
          this._isPlainText = mimeFuncs.isPlainText(this.content);
          if (this._isPlainText && mimeFuncs.hasLongerLines(this.content, 76)) {
            this._hasLongLines = true;
          }
        }
        return this;
      }
      build(callback) {
        let promise;
        if (!callback) {
          promise = new Promise((resolve, reject) => {
            callback = shared.callbackPromise(resolve, reject);
          });
        }
        const done = callback;
        const stream = this.createReadStream();
        const buf = [];
        let buflen = 0;
        let returned = false;
        stream.on("readable", () => {
          let chunk;
          while ((chunk = stream.read()) !== null) {
            buf.push(chunk);
            buflen += chunk.length;
          }
        });
        stream.once("error", (err) => {
          if (returned) {
            return;
          }
          returned = true;
          return done(err);
        });
        stream.once("end", (chunk) => {
          if (returned) {
            return;
          }
          returned = true;
          if (chunk && chunk.length) {
            buf.push(chunk);
            buflen += chunk.length;
          }
          return done(null, Buffer.concat(buf, buflen));
        });
        return promise;
      }
      getTransferEncoding() {
        let transferEncoding = false;
        const contentType = (this.getHeader("Content-Type") || "").toString().toLowerCase().trim();
        if (this.content) {
          transferEncoding = (this.getHeader("Content-Transfer-Encoding") || "").toString().toLowerCase().trim();
          if (!transferEncoding || !["base64", "quoted-printable"].includes(transferEncoding)) {
            if (/^text\//i.test(contentType)) {
              if (this._isPlainText && !this._hasLongLines) {
                transferEncoding = "7bit";
              } else if (typeof this.content === "string" || this.content instanceof Buffer) {
                transferEncoding = this._getTextEncoding(this.content) === "Q" ? "quoted-printable" : "base64";
              } else {
                transferEncoding = this.textEncoding === "B" ? "base64" : "quoted-printable";
              }
            } else if (!/^(multipart|message)\//i.test(contentType)) {
              transferEncoding = transferEncoding || "base64";
            }
          }
        }
        return transferEncoding;
      }
      /**
       * Builds the header block for the mime node. Append \r\n\r\n before writing the content
       *
       * @returns Headers
       */
      buildHeaders() {
        const transferEncoding = this.getTransferEncoding();
        const headers = [];
        if (transferEncoding) {
          this.setHeader("Content-Transfer-Encoding", transferEncoding);
        }
        if (this.filename && !this.getHeader("Content-Disposition")) {
          this.setHeader("Content-Disposition", "attachment");
        }
        if (this.rootNode === this) {
          if (!this.getHeader("Date")) {
            this.setHeader("Date", this.date.toUTCString().replace(/GMT/, "+0000"));
          }
          this.messageId();
          if (!this.getHeader("MIME-Version")) {
            this.setHeader("MIME-Version", "1.0");
          }
          for (let i = this._headers.length - 2; i >= 0; i--) {
            const header = this._headers[i];
            if (header.key === "Content-Type") {
              this._headers.splice(i, 1);
              this._headers.push(header);
            }
          }
        }
        this._headers.forEach((header) => {
          let key = header.key;
          let value = header.value;
          let structured;
          let param;
          const options = {};
          const formattedHeaders = FORMATTED_HEADERS;
          if (value && typeof value === "object" && !formattedHeaders.includes(key)) {
            shared.copyOwnKeys(options, value, (optionKey) => optionKey === "value");
            value = (value.value || "").toString();
            if (!value.trim()) {
              return;
            }
          }
          if (options.prepared) {
            if (options.foldLines) {
              headers.push(mimeFuncs.foldLines(key + ": " + value));
            } else {
              headers.push(key + ": " + value);
            }
            return;
          }
          switch (header.key) {
            // The comments of a MIME header are not part of its value and are dropped, so a
            // caller supplied 'boundary=b (comment)' is the boundary b it names, and the
            // header goes out without the comment
            case "Content-Disposition":
              structured = mimeFuncs.parseHeaderValue(value, { stripComments: true });
              if (this.filename) {
                structured.params.filename = this.filename;
              }
              value = mimeFuncs.buildHeaderValue(structured);
              break;
            case "Content-Type":
              structured = mimeFuncs.parseHeaderValue(value, { stripComments: true });
              structured.value = (structured.value || "").toString().replace(/[\x00-\x1f\x7f]/g, "");
              this._handleContentType(structured);
              if (structured.value.match(/^text\/plain\b/) && typeof this.content === "string" && /[\u0080-\uFFFF]/.test(this.content)) {
                structured.params.charset = "utf-8";
              }
              if (this.filename) {
                for (const paramKey of Object.keys(structured.params)) {
                  if (/^name(\*|$)/i.test(paramKey)) {
                    delete structured.params[paramKey];
                  }
                }
              }
              value = mimeFuncs.buildHeaderValue(structured);
              if (this.filename) {
                param = /[\x00-\x1f\x7f]/.test(this.filename) ? mimeFuncs.encodeWord(this.filename, this._getTextEncoding(this.filename), 52) : this._encodeWords(this.filename);
                if (param !== this.filename || /[\s'"\\;:/=(),<>@[\]?]|^-/.test(param)) {
                  param = JSON.stringify(param);
                }
                value += "; name=" + param;
              }
              break;
            case "Bcc":
              if (!this.keepBcc) {
                return;
              }
              break;
          }
          value = this.encodeHeaderValue(key, value);
          if (!(value || "").toString().trim()) {
            return;
          }
          if (typeof this.normalizeHeaderKey === "function") {
            const normalized = this.normalizeHeaderKey(key, value);
            const cleaned = typeof normalized === "string" ? normalized.replace(/[\x00-\x1f\x7f]/g, "") : "";
            if (cleaned) {
              key = cleaned;
            }
          }
          headers.push(mimeFuncs.foldLines(key + ": " + value, 76));
        });
        return headers.join("\r\n");
      }
      /**
       * Streams the rfc2822 message from the current node. If this is a root node,
       * mandatory header fields are set if missing (Date, Message-Id, MIME-Version)
       *
       * @return Compiled message
       */
      createReadStream(options) {
        options = options || {};
        const stream = new node_stream_1.PassThrough(options);
        this.stream(stream, options, (err) => {
          if (err) {
            stream.destroy(err);
            return;
          }
          stream.end();
        });
        stream.once("close", () => {
          if (!stream.writableFinished) {
            this._destroyContentStreams();
          }
        });
        const stages = [stream];
        for (const transform of this._transforms) {
          stages.push(typeof transform === "function" ? transform() : transform);
        }
        stages.push(new last_newline_js_1.default());
        let outputStream = (0, node_stream_1.pipeline)(stages, PIPELINE_NOOP);
        for (const processFunc of this._processFuncs) {
          const input = outputStream;
          outputStream = processFunc(input);
          if (outputStream !== input) {
            (0, node_stream_1.finished)(outputStream, (err) => {
              if (err) {
                input.destroy();
              }
            });
          }
        }
        if (this.newline) {
          const winbreak = ["win", "windows", "dos", "\r\n"].includes(this.newline.toString().toLowerCase());
          outputStream = (0, node_stream_1.pipeline)(outputStream, winbreak ? new le_windows_js_1.default() : new le_unix_js_1.default(), PIPELINE_NOOP);
        }
        return outputStream;
      }
      /**
       * Appends a transform stream object to the transforms list. Final output
       * is passed through this stream before exposing
       *
       * @param transform Read-Write stream
       */
      transform(transform) {
        this._transforms.push(transform);
      }
      /**
       * Appends a post process function. The functon is run after transforms and
       * uses the following syntax
       *
       *   processFunc(input) -> outputStream
       *
       * @param processFunc Read-Write stream
       */
      processFunc(processFunc) {
        this._processFuncs.push(processFunc);
      }
      stream(outputStream, options, done) {
        const transferEncoding = this.getTransferEncoding();
        let activeStreams = [];
        let returned = false;
        const callback = (err) => {
          if (returned) {
            return;
          }
          returned = true;
          outputStream.removeListener("close", onOutputClose);
          done(err);
        };
        function onOutputClose() {
          for (const stream of activeStreams) {
            stream.destroy();
          }
          return callback(abortedError());
        }
        const readInto = (...streams) => {
          if (!activeStreams.length) {
            outputStream.once("close", onOutputClose);
          }
          activeStreams = streams;
        };
        const aborted = () => {
          if (outputStream.destroyed) {
            callback(abortedError());
            return true;
          }
          return false;
        };
        const finalize = () => {
          let childId = 0;
          const processChildNode = () => {
            if (aborted()) {
              return;
            }
            if (childId >= this.childNodes.length) {
              outputStream.write("\r\n--" + this.boundary + "--\r\n");
              return callback();
            }
            const child = this.childNodes[childId++];
            outputStream.write((childId > 1 ? "\r\n" : "") + "--" + this.boundary + "\r\n");
            child.stream(outputStream, options, (err) => {
              if (err) {
                return callback(err);
              }
              setImmediate(processChildNode);
            });
          };
          if (this.multipart) {
            setImmediate(processChildNode);
          } else {
            return callback();
          }
        };
        const sendContent = () => {
          if (aborted()) {
            return;
          }
          if (!this.content) {
            return setImmediate(finalize);
          }
          const createStream = () => {
            if (aborted()) {
              return;
            }
            const contentError = this._takeStreamContent(this.content);
            if (contentError) {
              return callback(contentError);
            }
            const localStream = this._getStream(this.content);
            if (["quoted-printable", "base64"].includes(transferEncoding)) {
              const contentStream = transferEncoding === "base64" ? new base64.Encoder(options) : (
                // outside of text a lone CR or LF is data, encoding it keeps it from being
                // turned into a line break by a newline transform or the receiving side
                new qp.Encoder(Object.assign({}, options, { binary: !/^text\//i.test(this.contentType || "") }))
              );
              readInto(localStream, contentStream);
              contentStream.pipe(outputStream, {
                end: false
              });
              (0, node_stream_1.pipeline)(localStream, contentStream, (err) => err && callback(err));
              (0, node_stream_1.finished)(contentStream, { writable: false }, (err) => err ? callback(err) : finalize());
            } else {
              readInto(localStream);
              localStream.pipe(outputStream, {
                end: false
              });
              (0, node_stream_1.finished)(localStream, { writable: false }, (err) => err ? callback(err) : finalize());
            }
          };
          if (this.content._resolve) {
            const sourceStream = this._getStream(this.content);
            readInto(sourceStream);
            shared.resolveStream(sourceStream, (err, value) => {
              if (err) {
                return callback(err);
              }
              if (returned) {
                return;
              }
              this.content._resolve = false;
              this.content._resolvedValue = value;
              setImmediate(createStream);
            });
          } else {
            setImmediate(createStream);
          }
        };
        if (this._raw) {
          setImmediate(() => {
            if (aborted()) {
              return;
            }
            const rawError = this._takeStreamContent(this._raw);
            if (rawError) {
              return callback(rawError);
            }
            const raw = this._getStream(this._raw);
            readInto(raw);
            raw.pipe(outputStream, {
              end: false
            });
            (0, node_stream_1.finished)(raw, { writable: false }, (err) => err ? callback(err) : finalize());
          });
        } else {
          outputStream.write(this.buildHeaders() + "\r\n\r\n");
          setImmediate(sendContent);
        }
      }
      /**
       * Sets envelope to be used instead of the generated one
       *
       * @return SMTP envelope in the form of {from: 'from@example.com', to: ['to@example.com']}
       */
      setEnvelope(envelope) {
        let list;
        this._envelope = {
          from: false,
          to: []
        };
        if (envelope.from) {
          list = [];
          this._convertAddresses(this._parseEnvelopeAddresses(envelope.from), list);
          list = list.filter((address) => address && address.address);
          if (list.length && list[0]) {
            this._envelope.from = list[0].address;
          }
        }
        const seenRecipients = /* @__PURE__ */ new Set();
        const recipients = [];
        ["to", "cc", "bcc"].forEach((key) => {
          if (envelope[key]) {
            this._convertAddresses(this._parseEnvelopeAddresses(envelope[key]), recipients, seenRecipients);
          }
        });
        this._envelope.to = recipients.map((to) => to.address).filter((address) => address);
        const standardFields = ["to", "cc", "bcc", "from"];
        shared.copyOwnKeys(this._envelope, envelope, (key) => standardFields.includes(key));
        return this;
      }
      /**
       * Generates and returns an object with parsed address fields
       *
       * @return Address object
       */
      getAddresses() {
        const addresses = {};
        const seenByKey = /* @__PURE__ */ new Map();
        this._headers.forEach((header) => {
          const key = header.key.toLowerCase();
          if (["from", "sender", "reply-to", "to", "cc", "bcc"].includes(key)) {
            if (!Array.isArray(addresses[key])) {
              addresses[key] = [];
              seenByKey.set(key, /* @__PURE__ */ new Set());
            }
            this._convertAddresses(this._parseAddresses(header.value), addresses[key], seenByKey.get(key));
          }
        });
        return addresses;
      }
      /**
       * Generates and returns SMTP envelope with the sender address and a list of recipients addresses
       *
       * @return SMTP envelope in the form of {from: 'from@example.com', to: ['to@example.com']}
       */
      getEnvelope() {
        if (this._envelope) {
          return this._envelope;
        }
        const envelope = {
          from: false,
          to: []
        };
        const seenRecipients = /* @__PURE__ */ new Set();
        const recipients = [];
        this._headers.forEach((header) => {
          const list = [];
          if (header.key === "From" || !envelope.from && ["Reply-To", "Sender"].includes(header.key)) {
            this._convertAddresses(this._parseAddresses(header.value), list);
            if (list.length && list[0]) {
              envelope.from = list[0].address;
            }
          } else if (["To", "Cc", "Bcc"].includes(header.key)) {
            this._convertAddresses(this._parseAddresses(header.value), recipients, seenRecipients);
          }
        });
        envelope.to = recipients.map((to) => to.address);
        return envelope;
      }
      /**
       * Returns Message-Id value. If it does not exist, then creates one
       *
       * @return Message-Id value
       */
      messageId() {
        let messageId = this.getHeader("Message-ID");
        if (!messageId) {
          messageId = this._generateMessageId();
          this.setHeader("Message-ID", messageId);
        }
        return messageId;
      }
      /**
       * Sets pregenerated content that will be used as the output of this node
       *
       * @param raw Raw MIME contents
       */
      setRaw(raw) {
        this._raw = raw;
        if (this._raw && typeof this._raw.pipe === "function") {
          shared.recordStreamErrors(this._raw);
        }
        return this;
      }
      /////// PRIVATE METHODS
      /**
       * Checks an access policy flag for this node and every node above it. The flags are set
       * from the options the node was built with, and createChild only ever sees the options
       * the caller passed, so a child of a closed tree starts out open. Reading the answer off
       * the parent chain keeps it right whatever order the tree was assembled in.
       *
       * @param flag Either 'disableFileAccess' or 'disableUrlAccess'
       * @return true if this node or an ancestor closed that access
       * @internal
       */
      _accessDisabled(flag) {
        let node = this;
        while (node) {
          if (node[flag]) {
            return true;
          }
          node = node.parentNode;
        }
        return false;
      }
      /**
       * Destroys the content streams of this node and of every node below it
       *
       * @internal
       */
      _destroyContentStreams() {
        shared.destroyStream(this.content);
        shared.destroyStream(this._raw);
        for (const child of this.childNodes) {
          child._destroyContentStreams();
        }
      }
      /**
       * Checks that a content value can still be read before the node streams it. A stream is
       * refused once it errored, ended or was destroyed: piping it would either never finish or
       * produce an empty body without any error
       *
       * @param content Node content or raw value
       * @returns The error to stop with, or null when the content can be read
       * @internal
       */
      _takeStreamContent(content) {
        if (Object.prototype.toString.call(content) === "[object Error]") {
          return content;
        }
        if (!content || typeof content.pipe !== "function" || content._resolvedValue) {
          return null;
        }
        return shared.unreadableStreamError(content);
      }
      /**
       * Detects and returns handle to a stream related with the content.
       *
       * @param content Node content
       * @returns Stream object
       * @internal
       */
      _getStream(content) {
        let contentStream;
        if (content._resolvedValue) {
          contentStream = new node_stream_1.PassThrough();
          setImmediate(() => {
            try {
              contentStream.end(content._resolvedValue);
            } catch (_err) {
              contentStream.emit("error", _err);
            }
          });
          return contentStream;
        }
        if (typeof content.pipe === "function") {
          return content;
        }
        if (content && typeof content.path === "string" && !content.href) {
          if (this._accessDisabled("disableFileAccess")) {
            contentStream = new node_stream_1.PassThrough();
            setImmediate(() => {
              const err = new Error("File access rejected for " + content.path);
              err.code = errors.EFILEACCESS;
              contentStream.emit("error", err);
            });
            return contentStream;
          }
          return node_fs_1.default.createReadStream(content.path);
        }
        if (content && typeof content.href === "string") {
          if (this._accessDisabled("disableUrlAccess")) {
            contentStream = new node_stream_1.PassThrough();
            setImmediate(() => {
              const err = new Error("Url access rejected for " + content.href);
              err.code = errors.EURLACCESS;
              contentStream.emit("error", err);
            });
            return contentStream;
          }
          return (0, index_js_2.default)(content.href, { headers: content.httpHeaders, tls: content.tls });
        }
        contentStream = new node_stream_1.PassThrough();
        setImmediate(() => {
          try {
            contentStream.end(content || "");
          } catch (_err) {
            contentStream.emit("error", _err);
          }
        });
        return contentStream;
      }
      /**
       * Parses addresses. Takes in a single address or an array or an
       * array of address arrays (eg. To: [[first group], [second group],...])
       *
       * @param addresses Addresses to be parsed
       * @return An array of address objects
       * @internal
       */
      _parseAddresses(addresses) {
        const flattened = [];
        const seen = /* @__PURE__ */ new WeakSet();
        const stack = [];
        const enter = (list) => {
          if (!seen.has(list)) {
            seen.add(list);
            stack.push({ list, pos: 0 });
          }
        };
        enter(Array.isArray(addresses) ? addresses : [addresses]);
        while (stack.length) {
          const frame = stack[stack.length - 1];
          if (frame.pos >= frame.list.length) {
            stack.pop();
            continue;
          }
          const address = frame.list[frame.pos++];
          if (Array.isArray(address)) {
            enter(address);
            continue;
          }
          if (address && address.address) {
            const normalized = this._normalizeAddress(address.address);
            if (normalized === address.address && typeof address.name === "string") {
              flattened.push(address);
              continue;
            }
            const copy = shared.copyOwnKeys({}, address);
            copy.address = normalized;
            copy.name = address.name || "";
            flattened.push(copy);
            continue;
          }
          const parsed = this._normalizeParsedAddresses((0, index_js_1.default)(address));
          for (let i = 0; i < parsed.length; i++) {
            flattened.push(parsed[i]);
          }
        }
        return flattened;
      }
      /**
       * Normalizes the addresses of a freshly parsed address list, groups included.
       *
       * Everything this method returns carries a normalized address, whether it arrived as an
       * object or was parsed out of a header value. Without this the two shapes disagree, and
       * a consumer reading the parsed form back is handed the ambiguous
       * 'user@evil.com@good.com' that the header and the envelope no longer carry.
       *
       * @param parsed An array of address objects, as returned by addressparser
       * @return The same array, with every address normalized
       * @internal
       */
      _normalizeParsedAddresses(parsed) {
        parsed.forEach((entry) => {
          if (entry.address) {
            entry.address = this._normalizeAddress(entry.address);
          } else if (entry.group) {
            this._normalizeParsedAddresses(entry.group);
          }
        });
        return parsed;
      }
      /**
       * Parses the addresses of an explicitly set envelope.
       *
       * An envelope value is an addr-spec and never a display name, so a bare local username
       * such as 'root' is the address here. Header parsing has to read the same value as a
       * display name, as a value with no '@' in it can not be an addr-spec in a header.
       *
       * @param addresses Addresses to be parsed
       * @return An array of address objects
       * @internal
       */
      _parseEnvelopeAddresses(addresses) {
        return this._parseAddresses(addresses).map((entry) => {
          if (entry.address || entry.group || !entry.name || /[\s@]/.test(entry.name)) {
            return entry;
          }
          return { address: this._normalizeAddress(entry.name), name: "" };
        });
      }
      /**
       * Normalizes a header key, uses Camel-Case form, except for uppercase MIME-
       *
       * @param key Key to be normalized
       * @return key in Camel-Case form
       * @internal
       */
      _normalizeHeaderKey(key) {
        key = (key || "").toString().replace(/[\s\x00-\x20\x7f:]/g, "").toLowerCase().replace(/^X-SMTPAPI$|^(MIME|DKIM|ARC|BIMI)\b|^OTP(?=-Token$)|^[a-z]|-(SPF|FBL|ID|MD5)$|-[a-z]/gi, (c) => c.toUpperCase()).replace(/^Content-Features$/i, "Content-features");
        return key;
      }
      /**
       * Checks if the content type is multipart and defines boundary if needed.
       * Doesn't return anything, modifies object argument instead.
       *
       * @param structured Parsed header value for 'Content-Type' key
       * @internal
       */
      _handleContentType(structured) {
        this.contentType = structured.value.trim().toLowerCase();
        this.multipart = /^multipart\//i.test(this.contentType) ? this.contentType.substr(this.contentType.indexOf("/") + 1) : false;
        if (this.multipart) {
          const declared = _stripBoundaryControls(structured.params.boundary || this.boundary || "");
          this.boundary = structured.params.boundary = declared || _stripBoundaryControls(this._generateBoundary());
        } else {
          this.boundary = false;
        }
      }
      /**
       * Generates a multipart boundary value
       *
       * @return boundary value
       * @internal
       */
      _generateBoundary() {
        return _stripBoundaryControls(this.rootNode.boundaryPrefix + "-" + this.rootNode.baseBoundary) + "-Part_" + this._nodeId;
      }
      /**
       * Encodes a header value the way this node encodes it in the generated message:
       * address headers are punycoded and mime encoded, message id headers get their
       * angle brackets, a Date object is formatted and any other value is mime encoded
       * when it holds non-ascii or control characters (using the node's `textEncoding`).
       *
       * The result is a single unfolded line without the key. Fold it before writing it
       * into a message, `key + ': ' + value` folded at 76 characters is what the node does.
       *
       * @param key Header key, case insensitive
       * @param value Header value
       * @returns Encoded header value
       */
      encodeHeaderValue(key, value) {
        key = this._normalizeHeaderKey(key);
        switch (key) {
          // Structured headers
          case "From":
          case "Sender":
          case "To":
          case "Cc":
          case "Bcc":
          case "Reply-To":
            return this._convertAddresses(this._parseAddresses(value));
          // values enclosed in <>
          case "Message-ID":
          case "In-Reply-To":
          case "Content-ID":
            value = (value || "").toString().replace(/\r?\n|\r/g, " ").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
            if (value.charAt(0) !== "<") {
              value = "<" + value;
            }
            if (value.charAt(value.length - 1) !== ">") {
              value = value + ">";
            }
            return value;
          // a structured field (RFC 9651) that can not be mime encoded, an encoded word would
          // turn its quoted strings into text that no structured field parser reads. Only
          // the characters that can not appear in a header at all are removed
          case "OTP-Token":
            return (value || "").toString().replace(/\r?\n|\r/g, " ").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
          // space separated list of values enclosed in <>
          case "References": {
            const ids = [];
            for (const entry of [].concat(value || "")) {
              const elm = (entry || "").toString().replace(/\r?\n|\r/g, " ").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "").trim();
              for (let id of stripWhitespaceInAngleBrackets(elm).split(/\s+/)) {
                if (id.charAt(0) !== "<") {
                  id = "<" + id;
                }
                if (id.charAt(id.length - 1) !== ">") {
                  id = id + ">";
                }
                ids.push(id);
              }
            }
            return ids.join(" ").trim();
          }
          case "Date":
            if (Object.prototype.toString.call(value) === "[object Date]") {
              return value.toUTCString().replace(/GMT/, "+0000");
            }
            value = (value || "").toString().replace(/\r?\n|\r/g, " ");
            return this._encodeHeaderText(value);
          case "Content-Type":
          case "Content-Disposition":
            return (value || "").toString().replace(/\r?\n|\r/g, " ");
          default:
            value = (value || "").toString().replace(/\r?\n|\r/g, " ");
            return this._encodeHeaderText(value);
        }
      }
      /**
       * Encodes a header value without a node at hand. Same as the instance method of a
       * node created with the given options.
       *
       * @param key Header key, case insensitive
       * @param value Header value
       * @param [options] Encoding options
       * @param [options.textEncoding] either 'Q' (the default) or 'B'
       * @returns Encoded header value
       */
      static encodeHeaderValue(key, value, options) {
        return new _MimeNode(false, { textEncoding: options?.textEncoding }).encodeHeaderValue(key, value);
      }
      /**
       * Alias of encodeHeaderValue, kept for callers that used the method before it was public
       *
       * @internal
       */
      _encodeHeaderValue(key, value) {
        return this.encodeHeaderValue(key, value);
      }
      /**
       * Rebuilds address object using punycode and other adjustments
       *
       * @param addresses An array of address objects
       * @param [uniqueList] An array to be populated with addresses
       * @param [seenAddresses] Addresses already added to uniqueList, shared with recursive calls to keep deduplication linear
       * @return address string
       * @internal
       */
      _convertAddresses(addresses, uniqueList, seenAddresses) {
        const values = [];
        uniqueList = uniqueList || [];
        if (!seenAddresses) {
          seenAddresses = /* @__PURE__ */ new Set();
          for (let i = 0; i < uniqueList.length; i++) {
            seenAddresses.add(uniqueList[i].address);
          }
        }
        [].concat(addresses || []).forEach((address) => {
          if (address.address) {
            address.address = this._normalizeAddress(address.address);
            if (!address.name) {
              values.push(PLAIN_ADDRESS.test(address.address) ? address.address : `<${address.address}>`);
            } else {
              values.push(`${this._encodeAddressName(address.name)} <${address.address}>`);
            }
            if (!seenAddresses.has(address.address)) {
              seenAddresses.add(address.address);
              uniqueList.push(address);
            }
          } else if (address.group) {
            const groupListAddresses = (address.group.length ? this._convertAddresses(address.group, uniqueList, seenAddresses) : "").trim();
            values.push(`${this._encodeAddressName(address.name)}:${groupListAddresses};`);
          }
        });
        return values.join(", ");
      }
      /**
       * Normalizes an email address
       *
       * @param address An array of address objects
       * @return address string
       * @internal
       */
      _normalizeAddress(address) {
        address = (address || "").toString().replace(/[\x00-\x1F\x7F<>]+/g, " ").trim();
        if (!address) {
          return address;
        }
        const literal = address.charAt(address.length - 1) === "]" ? DOMAIN_LITERAL_TAIL.exec(address) : null;
        const lastAt = literal ? address.length - literal[1].length - 1 : address.lastIndexOf("@");
        if (lastAt < 0) {
          return this._normalizeLocalPart(address);
        }
        const user = address.substr(0, lastAt);
        const domain = address.substr(lastAt + 1);
        let encodedDomain = domain;
        const smtputf8 = /[\x80-\uFFFF]/.test(user);
        try {
          encodedDomain = normalizeDomain(domain.toLowerCase(), smtputf8);
        } catch (_err) {
        }
        return `${this._normalizeLocalPart(user)}@${encodedDomain}`;
      }
      /**
       * Normalizes the local part of an address into a form that can be emitted as is.
       *
       * A local part is either a dot-atom or a quoted-string, anything else is not a valid
       * addr-spec. The quotes of a quoted local part get lost along the way, and a bare
       * 'user@evil.com@good.com' leaves it to the receiver which '@' splits the domain off,
       * while the split here is always at the last one. So whatever is not already one of
       * the two valid forms goes back out as a quoted-string.
       *
       * @param user Local part of an address
       * @return Local part as a dot-atom or as a quoted-string
       * @internal
       */
      _normalizeLocalPart(user) {
        if (DOT_ATOM.test(user) || QUOTED_STRING.test(user)) {
          return user;
        }
        return mimeFuncs.quoteString(user);
      }
      /**
       * If needed, mime encodes the name part
       *
       * @param name Name part of an address
       * @returns Mime word encoded string if needed
       * @internal
       */
      _encodeAddressName(name) {
        if (!/^[\w ]*$/.test(name)) {
          if (/^[\x20-\x7e]*$/.test(name)) {
            return mimeFuncs.quoteString(name);
          } else {
            return mimeFuncs.encodeWord(name, this._getTextEncoding(name), 52);
          }
        }
        return name;
      }
      /**
       * Encodes an unstructured header value. Such a value can only carry VCHAR and WSP, so a
       * control char or DEL has to be forced into the mime encoded word that a non-ascii value
       * would get anyway. HT stays as it is, it is valid folding whitespace here.
       *
       * @param value Header value to encode
       * @returns Mime word encoded string if needed
       * @internal
       */
      _encodeHeaderText(value) {
        return /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value) ? mimeFuncs.encodeWord(value, this._getTextEncoding(value), 52) : (
          // encodeWords only encodes if needed, otherwise the original string is returned
          this._encodeWords(value)
        );
      }
      /**
       * If needed, mime encodes the name part
       *
       * @param value Name part of an address
       * @returns Mime word encoded string if needed
       * @internal
       */
      _encodeWords(value) {
        return mimeFuncs.encodeWords(value, this._getTextEncoding(value), 52, true);
      }
      /**
       * Detects best mime encoding for a text value
       *
       * @param value Value to check for
       * @return either 'Q' or 'B'
       * @internal
       */
      _getTextEncoding(value) {
        value = (value || "").toString();
        if (this.textEncoding) {
          return this.textEncoding;
        }
        let nonLatinLen = 0;
        let latinLen = 0;
        for (let i = 0, len = value.length; i < len; i++) {
          const code = value.charCodeAt(i);
          if (code >= 0 && code <= 8 || code === 11 || code === 12 || code >= 14 && code <= 31 || code >= 128) {
            nonLatinLen++;
          } else if (code >= 65 && code <= 90 || code >= 97 && code <= 122) {
            latinLen++;
          }
        }
        return nonLatinLen < latinLen ? "Q" : "B";
      }
      /**
       * Generates a message id
       *
       * @return Random Message-ID value
       * @internal
       */
      _generateMessageId() {
        return "<" + [2, 2, 2, 6].reduce(
          // crux to generate UUID-like random strings
          (prev, len) => prev + "-" + node_crypto_1.default.randomBytes(len).toString("hex"),
          node_crypto_1.default.randomBytes(4).toString("hex")
        ) + "@" + // try to use the domain of the FROM address or fallback to server hostname
        (this.getEnvelope().from || this.hostname || "localhost").split("@").pop() + ">";
      }
    };
    exports2.default = MimeNode;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/mail-composer/index.js
var require_mail_composer = __commonJS({
  "node_modules/nodemailer/dist/cjs/mail-composer/index.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var index_js_1 = __importDefault(require_mime_node());
    var mimeFuncs = __importStar(require_mime_funcs());
    var errors = __importStar(require_errors());
    var index_js_2 = require_shared();
    function isContentObject(value) {
      const content = value;
      return typeof value === "object" && !!(content.content || content.path || content.href || content.raw);
    }
    function fitsSevenBit(content) {
      let at;
      let length;
      if (typeof content === "string") {
        at = (i) => content.charCodeAt(i);
        length = content.length;
      } else if (Buffer.isBuffer(content)) {
        at = (i) => content[i];
        length = content.length;
      } else {
        return false;
      }
      let lineLength = 0;
      for (let i = 0; i < length; i++) {
        const c = at(i);
        if (c === 0 || c > 127) {
          return false;
        }
        if (c === 10 || c === 13) {
          lineLength = 0;
        } else if (++lineLength > 998) {
          return false;
        }
      }
      return true;
    }
    var MailComposer = class {
      constructor(mail) {
        this.mail = mail || {};
        this.message = false;
      }
      /**
       * Builds MimeNode instance
       */
      compile() {
        this._alternatives = this.getAlternatives();
        this._htmlNode = this._alternatives.filter((alternative) => /^text\/html\b/i.test(alternative.contentType)).pop();
        this._attachments = this.getAttachments(!!this._htmlNode);
        this._useRelated = !!(this._htmlNode && this._attachments.related.length);
        this._useAlternative = this._alternatives.length > 1;
        this._useMixed = this._attachments.attached.length > 1 || this._alternatives.length && this._attachments.attached.length === 1;
        if (this.mail.raw) {
          this.message = new index_js_1.default("message/rfc822", {
            newline: this.mail.newline,
            disableUrlAccess: this.mail.disableUrlAccess,
            disableFileAccess: this.mail.disableFileAccess
          }).setRaw(this.mail.raw);
        } else if (this._useMixed) {
          this.message = this._createMixed();
        } else if (this._useAlternative) {
          this.message = this._createAlternative();
        } else if (this._useRelated) {
          this.message = this._createRelated();
        } else {
          this.message = this._createContentNode(false, [].concat(this._alternatives || []).concat(this._attachments.attached || []).shift() || {
            contentType: "text/plain",
            content: ""
          });
        }
        if (this.mail.headers) {
          this.message.addHeader(this.mail.headers);
        }
        if (this.mail.otp) {
          this.message.setHeader("OTP-Token", formatOtpToken(this.mail.otp));
        }
        ["from", "sender", "to", "cc", "bcc", "reply-to", "in-reply-to", "references", "subject", "message-id", "date"].forEach((header) => {
          const key = header.replace(/-(\w)/g, (o, c) => c.toUpperCase());
          if (this.mail[key]) {
            this.message.setHeader(header, this.mail[key]);
          }
        });
        if (this.mail.envelope) {
          this.message.setEnvelope(this.mail.envelope);
        }
        this.message.messageId();
        return this.message;
      }
      /**
       * List all attachments. Resulting attachment objects can be used as input for MimeNode nodes
       *
       * @param findRelated If true separate related attachments from attached ones
       * @returns An object of arrays (`related` and `attached`)
       */
      getAttachments(findRelated) {
        let eventObject;
        const attachments = [].concat(this.mail.attachments || []).map((attachment, i) => {
          if (/^data:/i.test(attachment.path || attachment.href)) {
            attachment = this._processDataUrl(attachment);
          }
          const contentType = attachment.contentType || mimeFuncs.detectMimeType(attachment.filename || attachment.path || attachment.href || "bin");
          const isImage = /^image\//i.test(contentType);
          const isMessageNode = /^message\//i.test(contentType);
          const contentDisposition = attachment.contentDisposition || (isMessageNode || isImage && attachment.cid ? "inline" : "attachment");
          let contentTransferEncoding;
          if ("contentTransferEncoding" in attachment) {
            contentTransferEncoding = attachment.contentTransferEncoding;
          } else if (isMessageNode) {
            contentTransferEncoding = !attachment.encoding && fitsSevenBit(attachment.content) ? "7bit" : "8bit";
          } else {
            contentTransferEncoding = "base64";
          }
          const data = {
            contentType,
            contentDisposition,
            contentTransferEncoding
          };
          if (attachment.filename) {
            data.filename = attachment.filename;
          } else if (!isMessageNode && attachment.filename !== false) {
            data.filename = (attachment.path || attachment.href || "").split(/[/\\]/).pop().split("?").shift() || "attachment-" + (i + 1);
            if (data.filename.indexOf(".") < 0) {
              data.filename += "." + mimeFuncs.detectExtension(data.contentType);
            }
          }
          if (/^https?:\/\//i.test(attachment.path)) {
            attachment.href = attachment.path;
            attachment.path = void 0;
          }
          if (attachment.cid) {
            data.cid = attachment.cid;
          }
          if (attachment.raw) {
            data.raw = attachment.raw;
          } else if (attachment.path) {
            data.content = {
              path: attachment.path
            };
          } else if (attachment.href) {
            data.content = {
              href: attachment.href,
              httpHeaders: attachment.httpHeaders,
              tls: attachment.tls
            };
          } else {
            data.content = attachment.content || "";
          }
          if (attachment.encoding) {
            data.encoding = attachment.encoding;
          }
          if (attachment.headers) {
            data.headers = attachment.headers;
          }
          return data;
        });
        if (this.mail.icalEvent) {
          eventObject = Object.assign({}, this._getIcalEvent());
          eventObject.contentType = "application/ics";
          if (!eventObject.headers) {
            eventObject.headers = {};
          }
          eventObject.filename = eventObject.filename || "invite.ics";
          eventObject.headers["Content-Disposition"] = "attachment";
          eventObject.headers["Content-Transfer-Encoding"] = "base64";
        }
        if (!findRelated) {
          return {
            attached: attachments.concat(eventObject || []),
            related: []
          };
        }
        return {
          attached: attachments.filter((attachment) => !attachment.cid).concat(eventObject || []),
          related: attachments.filter((attachment) => !!attachment.cid)
        };
      }
      /**
       * Returns the icalEvent value with `path`/`href`/data uri input normalized into
       * a `content` entry, the same way as for regular attachments. The same event is
       * included twice (as a text/calendar alternative and as an application/ics
       * attachment), so the shared content object is marked to be resolved just once
       * and the buffered result is reused by the second node.
       *
       * @returns Normalized icalEvent data
       * @internal
       */
      _getIcalEvent() {
        if (!this._icalEvent) {
          let icalEvent;
          if (isContentObject(this.mail.icalEvent)) {
            icalEvent = (0, index_js_2.copyOwnKeys)({}, this.mail.icalEvent);
          } else {
            icalEvent = {
              content: this.mail.icalEvent
            };
          }
          if (/^data:/i.test(icalEvent.path || icalEvent.href)) {
            icalEvent = this._processDataUrl(icalEvent);
          }
          if (/^https?:\/\//i.test(icalEvent.path)) {
            icalEvent.href = icalEvent.path;
            icalEvent.path = void 0;
          }
          if (!icalEvent.raw) {
            if (icalEvent.path) {
              icalEvent.content = {
                path: icalEvent.path
              };
              icalEvent.path = void 0;
            } else if (icalEvent.href) {
              icalEvent.content = {
                href: icalEvent.href,
                httpHeaders: icalEvent.httpHeaders,
                tls: icalEvent.tls
              };
              icalEvent.href = void 0;
            }
          }
          if (icalEvent.content && typeof icalEvent.content === "object") {
            icalEvent.content._resolve = true;
          }
          this._icalEvent = icalEvent;
        }
        return this._icalEvent;
      }
      /**
       * List alternatives. Resulting objects can be used as input for MimeNode nodes
       *
       * @returns An array of alternative elements. Includes the `text` and `html` values as well
       */
      getAlternatives() {
        const alternatives = [];
        let text, html, watchHtml, amp, eventObject;
        if (this.mail.text) {
          if (isContentObject(this.mail.text)) {
            text = this.mail.text;
          } else {
            text = {
              content: this.mail.text
            };
          }
          text.contentType = "text/plain; charset=utf-8";
        }
        if (this.mail.watchHtml) {
          if (isContentObject(this.mail.watchHtml)) {
            watchHtml = this.mail.watchHtml;
          } else {
            watchHtml = {
              content: this.mail.watchHtml
            };
          }
          watchHtml.contentType = "text/watch-html; charset=utf-8";
        }
        if (this.mail.amp) {
          if (isContentObject(this.mail.amp)) {
            amp = this.mail.amp;
          } else {
            amp = {
              content: this.mail.amp
            };
          }
          amp.contentType = "text/x-amp-html; charset=utf-8";
        }
        if (this.mail.icalEvent) {
          eventObject = Object.assign({}, this._getIcalEvent());
          eventObject.filename = false;
          eventObject.contentType = "text/calendar; charset=utf-8; method=" + (eventObject.method || "PUBLISH").toString().trim().toUpperCase();
          if (!eventObject.headers) {
            eventObject.headers = {};
          }
        }
        if (this.mail.html) {
          if (isContentObject(this.mail.html)) {
            html = this.mail.html;
          } else {
            html = {
              content: this.mail.html
            };
          }
          html.contentType = "text/html; charset=utf-8";
        }
        [].concat(text || []).concat(watchHtml || []).concat(amp || []).concat(html || []).concat(eventObject || []).concat(this.mail.alternatives || []).forEach((alternative) => {
          if (/^data:/i.test(alternative.path || alternative.href)) {
            alternative = this._processDataUrl(alternative);
          }
          const data = {
            contentType: alternative.contentType || mimeFuncs.detectMimeType(alternative.filename || alternative.path || alternative.href || "txt"),
            contentTransferEncoding: alternative.contentTransferEncoding
          };
          if (alternative.filename) {
            data.filename = alternative.filename;
          }
          if (/^https?:\/\//i.test(alternative.path)) {
            alternative.href = alternative.path;
            alternative.path = void 0;
          }
          if (alternative.raw) {
            data.raw = alternative.raw;
          } else if (alternative.path) {
            data.content = {
              path: alternative.path
            };
          } else if (alternative.href) {
            data.content = {
              href: alternative.href,
              httpHeaders: alternative.httpHeaders,
              tls: alternative.tls
            };
          } else {
            data.content = alternative.content || "";
          }
          if (alternative.encoding) {
            data.encoding = alternative.encoding;
          }
          if (alternative.headers) {
            data.headers = alternative.headers;
          }
          alternatives.push(data);
        });
        return alternatives;
      }
      /**
       * Builds multipart/mixed node. It should always contain different type of elements on the same level
       * eg. text + attachments
       *
       * @param parentNode Parent for this note. If it does not exist, a root node is created
       * @returns MimeNode node element
       * @internal
       */
      _createMixed(parentNode) {
        const node = parentNode ? parentNode.createChild("multipart/mixed", {
          disableUrlAccess: this.mail.disableUrlAccess,
          disableFileAccess: this.mail.disableFileAccess,
          normalizeHeaderKey: this.mail.normalizeHeaderKey,
          newline: this.mail.newline
        }) : new index_js_1.default("multipart/mixed", {
          baseBoundary: this.mail.baseBoundary,
          textEncoding: this.mail.textEncoding,
          boundaryPrefix: this.mail.boundaryPrefix,
          disableUrlAccess: this.mail.disableUrlAccess,
          disableFileAccess: this.mail.disableFileAccess,
          normalizeHeaderKey: this.mail.normalizeHeaderKey,
          newline: this.mail.newline
        });
        if (this._useAlternative) {
          this._createAlternative(node);
        } else if (this._useRelated) {
          this._createRelated(node);
        }
        [].concat(!this._useAlternative && this._alternatives || []).concat(this._attachments.attached || []).forEach((element) => {
          if (!this._useRelated || element !== this._htmlNode) {
            this._createContentNode(node, element);
          }
        });
        return node;
      }
      /**
       * Builds multipart/alternative node. It should always contain same type of elements on the same level
       * eg. text + html view of the same data
       *
       * @param parentNode Parent for this note. If it does not exist, a root node is created
       * @returns MimeNode node element
       * @internal
       */
      _createAlternative(parentNode) {
        const node = parentNode ? parentNode.createChild("multipart/alternative", {
          disableUrlAccess: this.mail.disableUrlAccess,
          disableFileAccess: this.mail.disableFileAccess,
          normalizeHeaderKey: this.mail.normalizeHeaderKey,
          newline: this.mail.newline
        }) : new index_js_1.default("multipart/alternative", {
          baseBoundary: this.mail.baseBoundary,
          textEncoding: this.mail.textEncoding,
          boundaryPrefix: this.mail.boundaryPrefix,
          disableUrlAccess: this.mail.disableUrlAccess,
          disableFileAccess: this.mail.disableFileAccess,
          normalizeHeaderKey: this.mail.normalizeHeaderKey,
          newline: this.mail.newline
        });
        this._alternatives.forEach((alternative) => {
          if (this._useRelated && this._htmlNode === alternative) {
            this._createRelated(node);
          } else {
            this._createContentNode(node, alternative);
          }
        });
        return node;
      }
      /**
       * Builds multipart/related node. It should always contain html node with related attachments
       *
       * @param parentNode Parent for this note. If it does not exist, a root node is created
       * @returns MimeNode node element
       * @internal
       */
      _createRelated(parentNode) {
        const node = parentNode ? parentNode.createChild('multipart/related; type="text/html"', {
          disableUrlAccess: this.mail.disableUrlAccess,
          disableFileAccess: this.mail.disableFileAccess,
          normalizeHeaderKey: this.mail.normalizeHeaderKey,
          newline: this.mail.newline
        }) : new index_js_1.default('multipart/related; type="text/html"', {
          baseBoundary: this.mail.baseBoundary,
          textEncoding: this.mail.textEncoding,
          boundaryPrefix: this.mail.boundaryPrefix,
          disableUrlAccess: this.mail.disableUrlAccess,
          disableFileAccess: this.mail.disableFileAccess,
          normalizeHeaderKey: this.mail.normalizeHeaderKey,
          newline: this.mail.newline
        });
        this._createContentNode(node, this._htmlNode);
        this._attachments.related.forEach((alternative) => this._createContentNode(node, alternative));
        return node;
      }
      /**
       * Creates a regular node with contents
       *
       * @param parentNode Parent for this note. If it does not exist, a root node is created
       * @param element Node data
       * @returns MimeNode node element
       * @internal
       */
      _createContentNode(parentNode, element) {
        element = element || {};
        element.content = element.content || "";
        const encoding = (element.encoding || "utf8").toString().toLowerCase().replace(/[-_\s]/g, "");
        const node = parentNode ? parentNode.createChild(element.contentType, {
          filename: element.filename,
          textEncoding: this.mail.textEncoding,
          disableUrlAccess: this.mail.disableUrlAccess,
          disableFileAccess: this.mail.disableFileAccess,
          normalizeHeaderKey: this.mail.normalizeHeaderKey,
          newline: this.mail.newline
        }) : new index_js_1.default(element.contentType, {
          filename: element.filename,
          baseBoundary: this.mail.baseBoundary,
          textEncoding: this.mail.textEncoding,
          boundaryPrefix: this.mail.boundaryPrefix,
          disableUrlAccess: this.mail.disableUrlAccess,
          disableFileAccess: this.mail.disableFileAccess,
          normalizeHeaderKey: this.mail.normalizeHeaderKey,
          newline: this.mail.newline
        });
        if (element.headers) {
          node.addHeader(element.headers);
        }
        if (element.cid) {
          node.setHeader("Content-Id", "<" + element.cid.replace(/[<>]/g, "") + ">");
        }
        if (element.contentTransferEncoding) {
          node.setHeader("Content-Transfer-Encoding", element.contentTransferEncoding);
        } else if (this.mail.encoding && /^text\//i.test(element.contentType)) {
          node.setHeader("Content-Transfer-Encoding", this.mail.encoding);
        }
        if (!/^text\//i.test(element.contentType) || element.contentDisposition) {
          node.setHeader("Content-Disposition", element.contentDisposition || (element.cid && /^image\//i.test(element.contentType) ? "inline" : "attachment"));
        }
        if (typeof element.content === "string" && !["utf8", "usascii", "ascii"].includes(encoding)) {
          element.content = Buffer.from(element.content, encoding);
        }
        if (element.raw) {
          node.setRaw(element.raw);
        } else {
          node.setContent(element.content);
        }
        return node;
      }
      /**
       * Parses data uri and converts it to a Buffer
       *
       * @param element Content element
       * @return Parsed element
       * @internal
       */
      _processDataUrl(element) {
        const dataUrl = element.path || element.href;
        if (!dataUrl || typeof dataUrl !== "string") {
          return element;
        }
        if (!dataUrl.startsWith("data:")) {
          return element;
        }
        if (dataUrl.length > 52428800) {
          let detectedType = "application/octet-stream";
          const commaPos = dataUrl.indexOf(",");
          if (commaPos > 0 && commaPos < 200) {
            const header = dataUrl.substring(5, commaPos);
            const parts = header.split(";");
            if (parts[0] && parts[0].includes("/")) {
              detectedType = parts[0].trim();
            }
          }
          return Object.assign((0, index_js_2.copyOwnKeys)({}, element), {
            path: false,
            href: false,
            content: Buffer.alloc(0),
            contentType: element.contentType || detectedType
          });
        }
        let parsedDataUri;
        try {
          parsedDataUri = (0, index_js_2.parseDataURI)(dataUrl);
        } catch (_err) {
          return element;
        }
        if (!parsedDataUri) {
          return element;
        }
        element.content = parsedDataUri.data;
        element.contentType = element.contentType || parsedDataUri.contentType;
        if ("path" in element) {
          element.path = false;
        }
        if ("href" in element) {
          element.href = false;
        }
        return element;
      }
    };
    function formatOtpToken(otp) {
      if (typeof otp.code !== "string" || !/^[\x20-\x7e]+$/.test(otp.code)) {
        throw otpError("The otp code must be a non-empty string of printable ASCII characters");
      }
      return mimeFuncs.quoteString(otp.code) + "; origin=" + mimeFuncs.quoteString(getOtpOrigin(otp.origin));
    }
    function getOtpOrigin(origin) {
      let url;
      try {
        url = new URL(String(origin));
      } catch {
      }
      if (!url || url.username || url.password || !/^([a-z0-9_-]+\.)*[a-z0-9_-]+$|^\[[0-9a-f:.]+\]$/.test(url.hostname)) {
        throw otpError("The otp origin must be an absolute https URL");
      }
      const isLoopback = /^(localhost|.+\.localhost|127(\.\d+){3}|\[::1\])$/.test(url.hostname);
      if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
        throw otpError("The otp origin must be an https URL, or an http URL on a loopback host");
      }
      return url.origin;
    }
    function otpError(message) {
      const err = new Error(message);
      err.code = errors.EOTP;
      return err;
    }
    exports2.default = MailComposer;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/dkim/message-parser.js
var require_message_parser = __commonJS({
  "node_modules/nodemailer/dist/cjs/dkim/message-parser.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_stream_1 = require("node:stream");
    function _trimFieldName(str2) {
      let start = 0;
      let end = str2.length;
      while (start < end && (str2.charCodeAt(start) === 32 || str2.charCodeAt(start) === 9)) {
        start++;
      }
      while (end > start && (str2.charCodeAt(end - 1) === 32 || str2.charCodeAt(end - 1) === 9)) {
        end--;
      }
      return str2.slice(start, end);
    }
    var MessageParser = class extends node_stream_1.Transform {
      constructor(options) {
        super(options);
        this.lastBytes = Buffer.alloc(4);
        this.headersParsed = false;
        this.headerBytes = 0;
        this.headerChunks = [];
        this.rawHeaders = false;
        this.bodySize = 0;
      }
      /**
       * Keeps count of the last 4 bytes in order to detect line breaks on chunk boundaries
       *
       * @param data Next data chunk from the stream
       */
      updateLastBytes(data) {
        const lblen = this.lastBytes.length;
        const nblen = Math.min(data.length, lblen);
        for (let i = 0, len = lblen - nblen; i < len; i++) {
          this.lastBytes[i] = this.lastBytes[i + nblen];
        }
        for (let i = 1; i <= nblen; i++) {
          this.lastBytes[lblen - i] = data[data.length - i];
        }
      }
      /**
       * Finds and removes message headers from the remaining body. We want to keep
       * headers separated until final delivery to be able to modify these
       *
       * @param data Next chunk of data
       * @return Returns true if headers are already found or false otherwise
       */
      checkHeaders(data) {
        if (this.headersParsed) {
          return true;
        }
        const lblen = this.lastBytes.length;
        let headerPos = 0;
        for (let i = 0, len = this.lastBytes.length + data.length; i < len; i++) {
          let chr;
          if (i < lblen) {
            chr = this.lastBytes[i];
          } else {
            chr = data[i - lblen];
          }
          if (chr === 10 && i) {
            const pr1 = i - 1 < lblen ? this.lastBytes[i - 1] : data[i - 1 - lblen];
            const pr2 = i > 1 ? i - 2 < lblen ? this.lastBytes[i - 2] : data[i - 2 - lblen] : false;
            if (pr1 === 10) {
              this.headersParsed = true;
              headerPos = i - lblen + 1;
              this.headerBytes += headerPos;
              break;
            } else if (pr1 === 13 && pr2 === 10) {
              this.headersParsed = true;
              headerPos = i - lblen + 1;
              this.headerBytes += headerPos;
              break;
            }
          }
        }
        if (this.headersParsed) {
          this.headerChunks.push(data.slice(0, headerPos));
          this.rawHeaders = Buffer.concat(this.headerChunks, this.headerBytes);
          this.headerChunks = null;
          this.emit("headers", this.parseHeaders());
          if (data.length > headerPos) {
            const chunk = data.slice(headerPos);
            this.bodySize += chunk.length;
            this.push(chunk);
          }
          return false;
        }
        this.headerBytes += data.length;
        this.headerChunks.push(data);
        this.updateLastBytes(data);
        return false;
      }
      /** @internal */
      _transform(chunk, encoding, callback) {
        if (!chunk || !chunk.length) {
          return callback();
        }
        if (typeof chunk === "string") {
          chunk = Buffer.from(chunk, encoding);
        }
        let headersFound;
        try {
          headersFound = this.checkHeaders(chunk);
        } catch (E) {
          return callback(E);
        }
        if (headersFound) {
          this.bodySize += chunk.length;
          this.push(chunk);
        }
        callback();
      }
      /** @internal */
      _flush(callback) {
        if (this.headerChunks) {
          this.rawHeaders = Buffer.concat(this.headerChunks, this.headerBytes);
          this.headerChunks = null;
          this.emit("headers", this.parseHeaders());
        }
        callback();
      }
      parseHeaders() {
        const rawLines = (this.rawHeaders || Buffer.alloc(0)).toString("binary").split(/\r?\n/);
        const lines = [];
        for (const rawLine of rawLines) {
          if (lines.length && /^[ \t]/.test(rawLine)) {
            lines[lines.length - 1] += "\n" + rawLine;
          } else {
            lines.push(rawLine);
          }
        }
        return lines.filter((line) => /[^ \t\r]/.test(line)).map((line) => ({
          key: _trimFieldName(line.substr(0, line.indexOf(":"))).toLowerCase(),
          line
        }));
      }
    };
    exports2.default = MessageParser;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/dkim/relaxed-body.js
var require_relaxed_body = __commonJS({
  "node_modules/nodemailer/dist/cjs/dkim/relaxed-body.js"(exports2, module2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_stream_1 = require("node:stream");
    var node_crypto_1 = __importDefault(require("node:crypto"));
    var CHAR_CR = 13;
    var CHAR_LF = 10;
    var CHAR_SPACE = 32;
    var CHAR_TAB = 9;
    var CRLF = Buffer.from("\r\n");
    var EMPTY_LINES = Buffer.alloc(4096, CRLF);
    var RelaxedBody = class extends node_stream_1.Transform {
      constructor(options) {
        super();
        options = options || {};
        this.bodyHash = node_crypto_1.default.createHash(options.hashAlgo || "sha256");
        this.byteLength = 0;
        this.debug = options.debug;
        this._debugBody = options.debug ? [] : false;
        this._lineHasContent = false;
        this._pendingWsp = false;
        this._pendingCr = false;
        this._pendingEmptyLines = 0;
      }
      /** @internal */
      _hashCanonical(data) {
        if (!data.length) {
          return;
        }
        this.bodyHash.update(data);
        if (this._debugBody) {
          this._debugBody.push(Buffer.from(data));
        }
      }
      /** @internal */
      _hashEmptyLines() {
        while (this._pendingEmptyLines > 0) {
          const count = Math.min(this._pendingEmptyLines, EMPTY_LINES.length / 2);
          this._hashCanonical(EMPTY_LINES.subarray(0, count * 2));
          this._pendingEmptyLines -= count;
        }
      }
      /**
       * Writes a content byte, with the space a pending run of whitespace collapses to,
       * into the output buffer and returns the new write position. Kept a method rather
       * than a closure so the write position stays a plain local in the byte loop
       * @internal
       */
      _emitContent(out, outPos, c) {
        if (!this._lineHasContent) {
          if (this._pendingEmptyLines) {
            this._hashCanonical(out.subarray(0, outPos));
            outPos = 0;
            this._hashEmptyLines();
          }
          this._lineHasContent = true;
        }
        if (this._pendingWsp) {
          out[outPos++] = CHAR_SPACE;
          this._pendingWsp = false;
        }
        out[outPos++] = c;
        return outPos;
      }
      updateHash(chunk, final) {
        const out = Buffer.allocUnsafe(chunk.length * 2 + 2);
        let outPos = 0;
        for (let i = 0; i < chunk.length; i++) {
          const c = chunk[i];
          if (c === CHAR_LF) {
            if (this._lineHasContent) {
              out[outPos++] = CHAR_CR;
              out[outPos++] = CHAR_LF;
              this._lineHasContent = false;
            } else {
              this._pendingEmptyLines++;
            }
            this._pendingWsp = false;
            this._pendingCr = false;
            continue;
          }
          if (this._pendingCr) {
            outPos = this._emitContent(out, outPos, CHAR_CR);
            this._pendingCr = false;
          }
          if (c === CHAR_CR) {
            this._pendingCr = true;
          } else if (c === CHAR_SPACE || c === CHAR_TAB) {
            this._pendingWsp = true;
          } else {
            outPos = this._emitContent(out, outPos, c);
          }
        }
        if (final && this._pendingCr) {
          outPos = this._emitContent(out, outPos, CHAR_CR);
          this._pendingCr = false;
        }
        this._hashCanonical(out.subarray(0, outPos));
      }
      /** @internal */
      _transform(chunk, encoding, callback) {
        if (!chunk || !chunk.length) {
          return callback();
        }
        if (typeof chunk === "string") {
          chunk = Buffer.from(chunk, encoding);
        }
        this.updateHash(chunk);
        this.byteLength += chunk.length;
        this.push(chunk);
        callback();
      }
      /** @internal */
      _flush(callback) {
        this.updateHash(Buffer.alloc(0), true);
        if (this._lineHasContent) {
          this._hashCanonical(CRLF);
        }
        this.emit("hash", this.bodyHash.digest("base64"), this.debug ? Buffer.concat(this._debugBody) : false);
        callback();
      }
    };
    exports2.default = RelaxedBody;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/dkim/sign.js
var require_sign = __commonJS({
  "node_modules/nodemailer/dist/cjs/dkim/sign.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var punycode = __importStar(require_punycode());
    var mimeFuncs = __importStar(require_mime_funcs());
    var node_crypto_1 = __importDefault(require("node:crypto"));
    var errors = __importStar(require_errors());
    function unsupportedHashAlgoError(hashAlgo) {
      const err = new Error('Unsupported DKIM hash algorithm "' + hashAlgo + '"');
      err.code = errors.ECONFIG;
      return err;
    }
    function sign2(headers, hashAlgo, bodyHash, options) {
      options = options || {};
      const defaultFieldNames = "From:Sender:Reply-To:Subject:Date:Message-ID:To:Cc:MIME-Version:Content-Type:Content-Transfer-Encoding:Content-ID:Content-Description:Resent-Date:Resent-From:Resent-Sender:Resent-To:Resent-Cc:Resent-Message-ID:In-Reply-To:References:List-Id:List-Help:List-Unsubscribe:List-Subscribe:List-Post:List-Owner:List-Archive:OTP-Token";
      const fieldNames = options.headerFieldNames || defaultFieldNames;
      const canonicalizedHeaderData = relaxedHeaders(headers, fieldNames, options.skipFields);
      const dkimHeader = generateDKIMHeader(options.domainName, options.keySelector, canonicalizedHeaderData.fieldNames, hashAlgo, bodyHash);
      canonicalizedHeaderData.headers += "dkim-signature:" + relaxedHeaderLine(dkimHeader);
      let signer;
      try {
        signer = node_crypto_1.default.createSign(("rsa-" + hashAlgo).toUpperCase());
      } catch (_E) {
        throw unsupportedHashAlgoError(hashAlgo);
      }
      signer.update(canonicalizedHeaderData.headers, "latin1");
      let signature;
      try {
        signature = signer.sign(options.privateKey, "base64");
      } catch (_E) {
        return false;
      }
      return dkimHeader + signature.replace(/(^.{73}|.{75}(?!\r?\n|\r))/g, "$&\r\n ").trim();
    }
    sign2.relaxedHeaders = relaxedHeaders;
    sign2.unsupportedHashAlgoError = unsupportedHashAlgoError;
    exports2.default = sign2;
    function generateDKIMHeader(domainName, keySelector, fieldNames, hashAlgo, bodyHash) {
      const cleanTagValue = (value) => (value || "").toString().replace(/[\x00-\x1f\x7f;=]/g, "");
      const dkim = [
        "v=1",
        "a=rsa-" + hashAlgo,
        "c=relaxed/relaxed",
        "d=" + punycode.toASCII(cleanTagValue(domainName)),
        "q=dns/txt",
        "s=" + cleanTagValue(keySelector),
        "bh=" + bodyHash,
        "h=" + cleanTagValue(fieldNames)
      ].join("; ");
      return mimeFuncs.foldLines("DKIM-Signature: " + dkim, 76) + ";\r\n b=";
    }
    function relaxedHeaders(headers, fieldNames, skipFields) {
      const includedFields = /* @__PURE__ */ new Set();
      const skip = /* @__PURE__ */ new Set();
      const headerFields = /* @__PURE__ */ new Map();
      (skipFields || "").toLowerCase().split(":").forEach((field) => {
        skip.add(field.trim());
      });
      (fieldNames || "").toLowerCase().split(":").filter((field) => !skip.has(field.trim())).forEach((field) => {
        includedFields.add(field.trim());
      });
      for (let i = headers.length - 1; i >= 0; i--) {
        const line = headers[i];
        if (includedFields.has(line.key) && !headerFields.has(line.key)) {
          headerFields.set(line.key, relaxedHeaderLine(line.line));
        }
      }
      const headersList = [];
      const fields = [];
      includedFields.forEach((field) => {
        if (headerFields.has(field)) {
          fields.push(field);
          headersList.push(field + ":" + headerFields.get(field));
        }
      });
      return {
        headers: headersList.join("\r\n") + "\r\n",
        fieldNames: fields.join(":")
      };
    }
    function relaxedHeaderLine(line) {
      return line.substr(line.indexOf(":") + 1).replace(/\r?\n/g, "").replace(/[ \t]+/g, " ").replace(/^ | $/g, "");
    }
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/dkim/index.js
var require_dkim = __commonJS({
  "node_modules/nodemailer/dist/cjs/dkim/index.js"(exports2, module2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var message_parser_js_1 = __importDefault(require_message_parser());
    var relaxed_body_js_1 = __importDefault(require_relaxed_body());
    var sign_js_1 = __importDefault(require_sign());
    var node_stream_1 = require("node:stream");
    var node_fs_1 = __importDefault(require("node:fs"));
    var node_path_1 = __importDefault(require("node:path"));
    var node_crypto_1 = __importDefault(require("node:crypto"));
    var objects_js_1 = require_objects();
    var DKIM_ALGO = "sha256";
    var MAX_MESSAGE_SIZE = 10 * 1024 * 1024;
    var DKIMSigner = class {
      constructor(options, keys, input, output) {
        this.options = options || {};
        this.keys = keys;
        this.cacheTreshold = Number(this.options.cacheTreshold) || MAX_MESSAGE_SIZE;
        this.hashAlgo = this.options.hashAlgo || DKIM_ALGO;
        this.cacheDir = this.options.cacheDir || false;
        this.chunks = [];
        this.chunklen = 0;
        this.readPos = 0;
        this.cachePath = this.cacheDir ? node_path_1.default.join(this.cacheDir, "message." + Date.now() + "-" + node_crypto_1.default.randomBytes(14).toString("hex")) : false;
        this.cache = false;
        this.headers = false;
        this.bodyHash = false;
        this.parser = false;
        this.relaxedBody = false;
        this.input = input;
        this.output = output;
        this.output.usingCache = false;
        this.hasErrored = false;
        this.input.on("error", (err) => this.fail(err));
        this.output.once("close", () => {
          if (this.output.writableFinished) {
            return;
          }
          this.hasErrored = true;
          this.input.unpipe();
          this.input.destroy();
          this.cleanup();
        });
      }
      /**
       * Ends the output with an error and releases the cache file
       */
      fail(err) {
        this.hasErrored = true;
        this.cleanup();
        this.output.destroy(err);
      }
      cleanup() {
        if (!this.cache || !this.cachePath) {
          return;
        }
        const cache = this.cache;
        this.cache = false;
        cache.destroy();
        node_fs_1.default.unlink(this.cachePath, () => false);
      }
      createReadCache() {
        this.cache = node_fs_1.default.createReadStream(this.cachePath);
        this.cache.once("error", (err) => this.fail(err));
        this.cache.once("close", () => {
          this.cleanup();
        });
        this.cache.pipe(this.output);
      }
      sendNextChunk() {
        while (!this.hasErrored) {
          if (this.readPos >= this.chunks.length) {
            if (!this.cache) {
              this.output.end();
              return;
            }
            return this.createReadCache();
          }
          const chunk = this.chunks[this.readPos++];
          if (this.output.write(chunk) === false) {
            this.output.once("drain", () => {
              this.sendNextChunk();
            });
            return;
          }
        }
      }
      sendSignedOutput() {
        if (this.hasErrored) {
          return;
        }
        let keyPos = 0;
        const signNextKey = () => {
          if (keyPos >= this.keys.length) {
            this.output.write(this.parser.rawHeaders);
            setImmediate(() => this.sendNextChunk());
            return;
          }
          const key = this.keys[keyPos++];
          let dkimField;
          try {
            dkimField = (0, sign_js_1.default)(this.headers, this.hashAlgo, this.bodyHash, {
              domainName: key.domainName,
              keySelector: key.keySelector,
              privateKey: key.privateKey,
              headerFieldNames: this.options.headerFieldNames,
              skipFields: this.options.skipFields
            });
          } catch (err) {
            this.fail(err);
            return;
          }
          if (dkimField) {
            this.output.write(Buffer.from(dkimField + "\r\n"));
          }
          setImmediate(signNextKey);
        };
        if (this.bodyHash && this.headers) {
          return signNextKey();
        }
        this.output.write(this.parser.rawHeaders);
        this.sendNextChunk();
      }
      createWriteCache() {
        this.output.usingCache = true;
        this.cache = node_fs_1.default.createWriteStream(this.cachePath, { mode: 384 });
        this.cache.once("error", (err) => {
          this.relaxedBody.unpipe(this.cache);
          this.relaxedBody.on("readable", () => {
            while (this.relaxedBody.read() !== null) {
            }
          });
          this.fail(err);
        });
        this.cache.once("close", () => {
          if (this.hasErrored) {
            return;
          }
          this.sendSignedOutput();
        });
        this.relaxedBody.removeAllListeners("readable");
        this.relaxedBody.pipe(this.cache);
      }
      signStream() {
        this.parser = new message_parser_js_1.default();
        this.relaxedBody = new relaxed_body_js_1.default({
          hashAlgo: this.hashAlgo
        });
        this.parser.on("headers", (value) => {
          this.headers = value;
        });
        this.relaxedBody.on("hash", (value) => {
          this.bodyHash = value;
        });
        this.relaxedBody.on("readable", () => {
          let chunk;
          if (this.cache) {
            return;
          }
          while ((chunk = this.relaxedBody.read()) !== null) {
            this.chunks.push(chunk);
            this.chunklen += chunk.length;
            if (this.chunklen >= this.cacheTreshold && this.cachePath) {
              return this.createWriteCache();
            }
          }
        });
        this.relaxedBody.on("end", () => {
          if (this.cache) {
            return;
          }
          this.sendSignedOutput();
        });
        this.parser.pipe(this.relaxedBody);
        setImmediate(() => this.input.pipe(this.parser));
      }
    };
    var DKIM = class {
      constructor(options) {
        this.options = options || {};
        this.keys = [].concat(this.options.keys || {
          domainName: options.domainName,
          keySelector: options.keySelector,
          privateKey: options.privateKey
        });
      }
      sign(input, extraOptions) {
        const output = new node_stream_1.PassThrough();
        let inputStream = input;
        let writeValue = false;
        if (Buffer.isBuffer(input)) {
          writeValue = input;
          inputStream = new node_stream_1.PassThrough();
        } else if (typeof input === "string") {
          writeValue = Buffer.from(input);
          inputStream = new node_stream_1.PassThrough();
        }
        let options = this.options;
        if (extraOptions && Object.keys(extraOptions).length) {
          options = (0, objects_js_1.copyOwnKeys)({}, extraOptions);
          (0, objects_js_1.copyOwnKeys)(options, this.options);
        }
        const signer = new DKIMSigner(options, this.keys, inputStream, output);
        setImmediate(() => {
          try {
            signer.signStream();
          } catch (_E) {
            signer.fail(sign_js_1.default.unsupportedHashAlgoError(signer.hashAlgo));
            return;
          }
          if (writeValue) {
            setImmediate(() => {
              inputStream.end(writeValue);
            });
          }
        });
        return output;
      }
    };
    exports2.default = DKIM;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/smtp-connection/http-proxy-client.js
var require_http_proxy_client = __commonJS({
  "node_modules/nodemailer/dist/cjs/smtp-connection/http-proxy-client.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_net_1 = __importDefault(require("node:net"));
    var node_tls_1 = __importDefault(require("node:tls"));
    var urllib = __importStar(require_url());
    var errors = __importStar(require_errors());
    var MAX_RESPONSE_HEADER_BYTES = 64 * 1024;
    var unbracket = (host) => typeof host === "string" && host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
    function httpProxyClient(proxyUrl, destinationPort, destinationHost, tlsOptions, callback) {
      if (typeof tlsOptions === "function") {
        callback = tlsOptions;
        tlsOptions = {};
      }
      tlsOptions = tlsOptions || {};
      const done = callback;
      destinationPort = Number(destinationPort) || 0;
      if (!destinationPort || /[\r\n]/.test(destinationHost)) {
        const err = new Error("Invalid proxy destination");
        err.code = errors.EPROXY;
        setImmediate(() => done(err));
        return;
      }
      const proxy = urllib.parse(proxyUrl);
      const authority = (node_net_1.default.isIPv6(unbracket(destinationHost)) ? "[" + unbracket(destinationHost) + "]" : destinationHost) + ":" + destinationPort;
      const connectOptions = {
        host: proxy.hostname,
        port: Number(proxy.port) ? Number(proxy.port) : proxy.protocol === "https:" ? 443 : 80
      };
      let connect;
      if (proxy.protocol === "https:") {
        connectOptions.rejectUnauthorized = tlsOptions.rejectUnauthorized !== false;
        connect = node_tls_1.default.connect.bind(node_tls_1.default);
      } else {
        connect = node_net_1.default.connect.bind(node_net_1.default);
      }
      const timeout = Number(tlsOptions.timeout) || httpProxyClient.timeout || 30 * 1e3;
      let socket;
      let finished = false;
      let timer;
      const cleanup = () => {
        clearTimeout(timer);
        socket.removeListener("data", onSocketData);
        socket.removeListener("error", fail);
        socket.removeListener("close", onEarlyClose);
      };
      function fail(err) {
        if (finished) {
          return;
        }
        finished = true;
        cleanup();
        try {
          socket.destroy();
        } catch (_E) {
        }
        done(err);
      }
      function onEarlyClose() {
        const err = new Error("Proxy closed the connection before the tunnel was established");
        err.code = errors.EPROXY;
        fail(err);
      }
      const chunks = [];
      let received = 0;
      let tail = "";
      function onSocketData(chunk) {
        if (finished) {
          return;
        }
        const window = tail + chunk.toString("binary");
        const windowEnd = window.indexOf("\r\n\r\n");
        chunks.push(chunk);
        received += chunk.length;
        tail = window.slice(-3);
        if (windowEnd < 0) {
          if (received > MAX_RESPONSE_HEADER_BYTES) {
            const err = new Error("Proxy response headers too large");
            err.code = errors.EPROXY;
            fail(err);
          }
          return;
        }
        socket.removeListener("data", onSocketData);
        socket.pause();
        const headerEnd = received - window.length + windowEnd;
        const response = Buffer.concat(chunks, received);
        if (response.length > headerEnd + 4) {
          socket.unshift(response.subarray(headerEnd + 4));
        }
        const match = response.toString("binary", 0, headerEnd).match(/^HTTP\/\d+\.\d+ (\d+)/i);
        if (!match || (match[1] || "").charAt(0) !== "2") {
          const err = new Error("Invalid response from proxy" + (match && ": " + match[1] || ""));
          err.code = errors.EPROXY;
          return fail(err);
        }
        finished = true;
        cleanup();
        const resumeOnData = (event) => {
          if (event === "data") {
            socket.removeListener("newListener", resumeOnData);
            socket.resume();
          }
        };
        socket.on("newListener", resumeOnData);
        return done(null, socket);
      }
      socket = connect(connectOptions, () => {
        if (finished) {
          return;
        }
        const reqHeaders = {
          Host: authority,
          Connection: "close"
        };
        if (proxy.auth) {
          reqHeaders["Proxy-Authorization"] = "Basic " + Buffer.from(proxy.auth).toString("base64");
        }
        socket.write(
          // HTTP method
          "CONNECT " + authority + " HTTP/1.1\r\n" + // HTTP request headers
          Object.keys(reqHeaders).map((key) => key + ": " + reqHeaders[key]).join("\r\n") + // End request
          "\r\n\r\n"
        );
        socket.on("data", onSocketData);
      });
      timer = setTimeout(() => {
        const err = new Error("Proxy socket timed out");
        err.code = errors.ETIMEDOUT;
        fail(err);
      }, timeout);
      socket.once("error", fail);
      socket.once("close", onEarlyClose);
    }
    exports2.default = httpProxyClient;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/mailer/mail-message.js
var require_mail_message = __commonJS({
  "node_modules/nodemailer/dist/cjs/mailer/mail-message.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var shared = __importStar(require_shared());
    var index_js_1 = __importDefault(require_mime_node());
    var mimeFuncs = __importStar(require_mime_funcs());
    var hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
    var MailMessage = class {
      constructor(mailer, data) {
        this.mailer = mailer;
        this.data = {};
        this.message = null;
        data = data || {};
        const options = mailer.options || {};
        const defaults = mailer._defaults || {};
        shared.copyOwnKeys(this.data, data);
        this.data.headers = this.data.headers || {};
        shared.copyOwnKeys(this.data, defaults, (key) => hasOwn(this.data, key));
        shared.copyOwnKeys(this.data.headers, defaults.headers, (key) => hasOwn(this.data.headers, key));
        ["disableFileAccess", "disableUrlAccess", "normalizeHeaderKey", "maxRecipients"].forEach((key) => {
          if (key in options) {
            this.data[key] = options[key];
          }
        });
        ["disableFileAccess", "disableUrlAccess"].forEach((key) => {
          if (!(key in options) && hasOwn(defaults, key)) {
            this.data[key] = this.data[key] || defaults[key];
          }
        });
      }
      resolveContent(data, key, options, callback) {
        if (!callback && typeof options === "function") {
          callback = options;
          options = false;
        }
        options = options || {};
        const policy = {
          disableFileAccess: this.data.disableFileAccess || options.disableFileAccess,
          disableUrlAccess: this.data.disableUrlAccess || options.disableUrlAccess
        };
        return shared.resolveContent(data, key, policy, callback);
      }
      resolveAll(callback) {
        const keys = [
          [this.data, "html"],
          [this.data, "text"],
          [this.data, "watchHtml"],
          [this.data, "amp"],
          [this.data, "icalEvent"]
        ];
        if (this.data.alternatives && this.data.alternatives.length) {
          this.data.alternatives.forEach((alternative, i) => {
            keys.push([this.data.alternatives, i]);
          });
        }
        if (this.data.attachments && this.data.attachments.length) {
          this.data.attachments.forEach((attachment, i) => {
            if (!attachment.filename) {
              attachment.filename = (attachment.path || attachment.href || "").split(/[/\\]/).pop().split("?").shift() || "attachment-" + (i + 1);
              if (attachment.filename.indexOf(".") < 0) {
                attachment.filename += "." + mimeFuncs.detectExtension(attachment.contentType);
              }
            }
            if (!attachment.contentType) {
              attachment.contentType = mimeFuncs.detectMimeType(attachment.filename || attachment.path || attachment.href || "bin");
            }
            keys.push([this.data.attachments, i]);
          });
        }
        const mimeNode = new index_js_1.default();
        const addressKeys = ["from", "to", "cc", "bcc", "sender", "replyTo"];
        addressKeys.forEach((address) => {
          let value;
          if (this.message) {
            value = [].concat(mimeNode._parseAddresses(this.message.getHeader(address === "replyTo" ? "reply-to" : address)) || []);
          } else if (this.data[address]) {
            value = [].concat(mimeNode._parseAddresses(this.data[address]) || []);
          }
          if (value && value.length) {
            this.data[address] = value;
          } else if (address in this.data) {
            this.data[address] = null;
          }
        });
        const singleKeys = ["from", "sender"];
        singleKeys.forEach((address) => {
          if (this.data[address]) {
            this.data[address] = this.data[address].shift();
          }
        });
        let pos = 0;
        const resolveNext = () => {
          if (pos >= keys.length) {
            return callback(null, this.data);
          }
          const args = keys[pos++];
          if (!args[0] || !args[0][args[1]]) {
            return resolveNext();
          }
          shared.resolveContent(...args, { disableFileAccess: this.data.disableFileAccess, disableUrlAccess: this.data.disableUrlAccess }, (err, value) => {
            if (err) {
              return callback(err);
            }
            const node = {
              content: value
            };
            if (args[0][args[1]] && typeof args[0][args[1]] === "object" && !Buffer.isBuffer(args[0][args[1]])) {
              shared.copyOwnKeys(node, args[0][args[1]], (key) => key in node || ["content", "path", "href", "raw"].includes(key));
            }
            args[0][args[1]] = node;
            resolveNext();
          });
        };
        setImmediate(() => resolveNext());
      }
      /**
       * Destroys the content streams of the message once sending failed. A stream that was not
       * read to the end would otherwise keep the file or the socket behind it open
       */
      releaseStreams() {
        const data = this.data;
        const values = [data.html, data.text, data.watchHtml, data.amp, data.raw, data.icalEvent];
        for (const key of ["attachments", "alternatives"]) {
          if (Array.isArray(data[key])) {
            for (const entry of data[key]) {
              values.push(entry);
            }
          }
        }
        for (const value of values) {
          if (value && typeof value === "object") {
            shared.destroyStream(value);
            shared.destroyStream(value.content);
            shared.destroyStream(value.raw);
          }
        }
      }
      normalize(callback) {
        const envelope = this.message.getEnvelope();
        const messageId = this.message.messageId();
        this.resolveAll((err, data) => {
          if (err) {
            return callback(err);
          }
          data.envelope = envelope;
          data.messageId = messageId;
          ["html", "text", "watchHtml", "amp"].forEach((key) => {
            if (data[key] && data[key].content) {
              if (typeof data[key].content === "string") {
                data[key] = data[key].content;
              } else if (Buffer.isBuffer(data[key].content)) {
                data[key] = data[key].content.toString();
              }
            }
          });
          if (data.icalEvent && Buffer.isBuffer(data.icalEvent.content)) {
            data.icalEvent.content = data.icalEvent.content.toString("base64");
            data.icalEvent.encoding = "base64";
          }
          if (data.alternatives && data.alternatives.length) {
            data.alternatives.forEach((alternative) => {
              if (alternative && alternative.content && Buffer.isBuffer(alternative.content)) {
                alternative.content = alternative.content.toString("base64");
                alternative.encoding = "base64";
              }
            });
          }
          if (data.attachments && data.attachments.length) {
            data.attachments.forEach((attachment) => {
              if (attachment && attachment.content && Buffer.isBuffer(attachment.content)) {
                attachment.content = attachment.content.toString("base64");
                attachment.encoding = "base64";
              }
            });
          }
          data.normalizedHeaders = {};
          Object.keys(data.headers || {}).forEach((key) => {
            if (shared.isProtoKey(key)) {
              return;
            }
            let value = [].concat(data.headers[key] || []).shift();
            value = value && value.value || value;
            if (value) {
              if (["references", "in-reply-to", "message-id", "content-id"].includes(key)) {
                value = this.message.encodeHeaderValue(key, value);
              }
              data.normalizedHeaders[key] = value;
            }
          });
          if (data.list && typeof data.list === "object") {
            const listHeaders = this._getListHeaders(data.list);
            listHeaders.forEach((entry) => {
              data.normalizedHeaders[entry.key] = entry.value.map((val) => val && val.value || val).join(", ");
            });
          }
          if (data.references) {
            data.normalizedHeaders.references = this.message.encodeHeaderValue("references", data.references);
          }
          if (data.inReplyTo) {
            data.normalizedHeaders["in-reply-to"] = this.message.encodeHeaderValue("in-reply-to", data.inReplyTo);
          }
          return callback(null, data);
        });
      }
      setMailerHeader() {
        if (!this.message || !this.data.xMailer) {
          return;
        }
        this.message.setHeader("X-Mailer", this.data.xMailer);
      }
      setPriorityHeaders() {
        if (!this.message || !this.data.priority) {
          return;
        }
        switch ((this.data.priority || "").toString().toLowerCase()) {
          case "high":
            this.message.setHeader("X-Priority", "1 (Highest)");
            this.message.setHeader("X-MSMail-Priority", "High");
            this.message.setHeader("Importance", "High");
            break;
          case "low":
            this.message.setHeader("X-Priority", "5 (Lowest)");
            this.message.setHeader("X-MSMail-Priority", "Low");
            this.message.setHeader("Importance", "Low");
            break;
          default:
        }
      }
      setListHeaders() {
        if (!this.message || !this.data.list || typeof this.data.list !== "object") {
          return;
        }
        this._getListHeaders(this.data.list).forEach((listHeader) => {
          listHeader.value.forEach((value) => {
            this.message.addHeader(listHeader.key, value);
          });
        });
      }
      /** @internal */
      _getListHeaders(listData) {
        return Object.keys(listData).map((key) => ({
          key: "list-" + key.toLowerCase().trim(),
          value: [].concat(listData[key] || []).map((value) => ({
            prepared: true,
            foldLines: true,
            value: [].concat(value || []).map((value2) => {
              if (typeof value2 === "string") {
                value2 = {
                  url: value2
                };
              }
              if (value2 && value2.url) {
                let comment = (value2.comment || "").toString().replace(/\r?\n|\r/g, " ");
                const needsEncoding = !mimeFuncs.isPlainText(comment) || /\x7f/.test(comment);
                if (key.toLowerCase().trim() === "id") {
                  comment = needsEncoding ? mimeFuncs.encodeWord(comment) : mimeFuncs.quoteString(comment);
                  return (value2.comment ? comment + " " : "") + this._formatListUrl(value2.url).replace(/^<[^:]+:\/{0,2}/, "<");
                }
                comment = needsEncoding ? mimeFuncs.encodeWord(comment) : comment.replace(/[()\\]/g, "\\$&");
                return this._formatListUrl(value2.url) + (value2.comment ? " (" + comment + ")" : "");
              }
              return "";
            }).filter((value2) => value2).join(", ")
          }))
        }));
      }
      /** @internal */
      _formatListUrl(url) {
        url = url.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "").replace(/[\s<]+|[\s>]+/g, "");
        if (/^(https?|mailto|ftp):/.test(url)) {
          return "<" + url + ">";
        }
        if (/^[^@]+@[^@]+$/.test(url)) {
          return "<mailto:" + url + ">";
        }
        return "<http://" + url + ">";
      }
    };
    exports2.default = MailMessage;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/mailer/index.js
var require_mailer = __commonJS({
  "node_modules/nodemailer/dist/cjs/mailer/index.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_events_1 = require("node:events");
    var shared = __importStar(require_shared());
    var mimeTypes = __importStar(require_mime_types());
    var index_js_1 = __importDefault(require_mail_composer());
    var index_js_2 = __importDefault(require_dkim());
    var http_proxy_client_js_1 = __importDefault(require_http_proxy_client());
    var errors = __importStar(require_errors());
    var node_util_1 = __importDefault(require("node:util"));
    var urllib = __importStar(require_url());
    var packageData = __importStar(require_package_info());
    var mail_message_js_1 = __importDefault(require_mail_message());
    var node_net_1 = __importDefault(require("node:net"));
    var node_dns_1 = __importDefault(require("node:dns"));
    var node_crypto_1 = __importDefault(require("node:crypto"));
    var DEFAULT_MAX_RECIPIENTS = 1e5;
    var Mail = class extends node_events_1.EventEmitter {
      constructor(transporter, options, defaults) {
        super();
        this.options = options || {};
        this._defaults = defaults || {};
        this._defaultPlugins = {
          compile: [(...args) => this._convertDataImages(...args)],
          stream: []
        };
        this._userPlugins = {
          compile: [],
          stream: []
        };
        this.meta = /* @__PURE__ */ new Map();
        this.dkim = this.options.dkim ? new index_js_2.default(this.options.dkim) : false;
        this.transporter = transporter;
        this.transporter.mailer = this;
        this.logger = shared.getLogger(this.options, {
          component: this.options.component || "mail"
        });
        this.logger.debug({
          tnx: "create"
        }, "Creating transport: %s", this.getVersionString());
        if (typeof this.transporter.on === "function") {
          this.transporter.on("log", (log) => {
            this.logger.debug({
              tnx: "transport"
            }, "%s: %s", log.type, log.message);
          });
          this.transporter.on("error", (err) => {
            this.logger.error({
              err,
              tnx: "transport"
            }, "Transport Error: %s", err.message);
            this.emit("error", err);
          });
          this.transporter.on("idle", (...args) => {
            this.emit("idle", ...args);
          });
          this.transporter.on("clear", (...args) => {
            this.emit("clear", ...args);
          });
        }
        ["close", "isIdle", "verify"].forEach((method) => {
          this[method] = (...args) => {
            if (typeof this.transporter[method] === "function") {
              if (method === "verify" && typeof this.getSocket === "function") {
                this.transporter.getSocket = this.getSocket;
                this.getSocket = false;
              }
              return this.transporter[method](...args);
            }
            this.logger.warn({
              tnx: "transport",
              methodName: method
            }, "Non existing method %s called for transport", method);
            return false;
          };
        });
        if (this.options.proxy && typeof this.options.proxy === "string") {
          this.setupProxy(this.options.proxy);
        }
      }
      use(step, plugin) {
        step = (step || "").toString();
        if (!this._userPlugins.hasOwnProperty(step)) {
          this._userPlugins[step] = [plugin];
        } else {
          this._userPlugins[step].push(plugin);
        }
        return this;
      }
      sendMail(data, callback = null) {
        let promise;
        if (!callback) {
          promise = new Promise((resolve, reject) => {
            callback = shared.callbackPromise(resolve, reject);
          });
        }
        const done = callback;
        if (typeof this.getSocket === "function") {
          this.transporter.getSocket = this.getSocket;
          this.getSocket = false;
        }
        const mail = new mail_message_js_1.default(this, data);
        const fail = (err) => {
          mail.releaseStreams();
          done(err);
        };
        this.logger.debug({
          tnx: "transport",
          name: this.transporter.name,
          version: this.transporter.version,
          action: "send"
        }, "Sending mail using %s/%s", this.transporter.name, this.transporter.version);
        this._processPlugins("compile", mail, (err) => {
          if (err) {
            this.logger.error({
              err,
              tnx: "plugin",
              action: "compile"
            }, "PluginCompile Error: %s", err.message);
            return fail(err);
          }
          let recipientCount;
          try {
            mail.message = new index_js_1.default(mail.data).compile();
            mail.setMailerHeader();
            mail.setPriorityHeaders();
            mail.setListHeaders();
            recipientCount = mail.message.getEnvelope().to.length;
          } catch (err2) {
            this.logger.error({
              err: err2,
              tnx: "transport",
              action: "send"
            }, "Compile Error: %s", err2.message);
            return fail(err2);
          }
          const maxRecipients = mail.data.maxRecipients === void 0 ? DEFAULT_MAX_RECIPIENTS : mail.data.maxRecipients;
          if (maxRecipients && recipientCount > maxRecipients) {
            const err2 = new Error(`Message has ${recipientCount} recipients, which is over the ${maxRecipients} allowed by maxRecipients`);
            err2.code = errors.EMAXRECIPIENTS;
            this.logger.error({
              err: err2,
              tnx: "transport",
              action: "send"
            }, "Send Error: %s", err2.message);
            return fail(err2);
          }
          this._processPlugins("stream", mail, (err2) => {
            if (err2) {
              this.logger.error({
                err: err2,
                tnx: "plugin",
                action: "stream"
              }, "PluginStream Error: %s", err2.message);
              return fail(err2);
            }
            if (mail.data.dkim || this.dkim) {
              mail.message.processFunc((input) => {
                const dkim = mail.data.dkim ? new index_js_2.default(mail.data.dkim) : this.dkim;
                this.logger.debug({
                  tnx: "DKIM",
                  messageId: mail.message.messageId(),
                  dkimDomains: dkim.keys.map((key) => key.keySelector + "." + key.domainName).join(", ")
                }, "Signing outgoing message with %s keys", dkim.keys.length);
                return dkim.sign(input, mail.data._dkim);
              });
            }
            this.transporter.send(mail, (...args) => {
              if (args[0]) {
                mail.releaseStreams();
                this.logger.error({
                  err: args[0],
                  tnx: "transport",
                  action: "send"
                }, "Send Error: %s", args[0].message);
              }
              done(...args);
            });
          });
        });
        return promise;
      }
      getVersionString() {
        return node_util_1.default.format("%s (%s; +%s; %s/%s)", packageData.name, packageData.version, packageData.homepage, this.transporter.name, this.transporter.version);
      }
      /** @internal */
      _processPlugins(step, mail, callback) {
        step = (step || "").toString();
        if (!this._userPlugins.hasOwnProperty(step)) {
          return callback();
        }
        const userPlugins = this._userPlugins[step] || [];
        const defaultPlugins = this._defaultPlugins[step] || [];
        if (userPlugins.length) {
          this.logger.debug({
            tnx: "transaction",
            pluginCount: userPlugins.length,
            step
          }, "Using %s plugins for %s", userPlugins.length, step);
        }
        if (userPlugins.length + defaultPlugins.length === 0) {
          return callback();
        }
        let pos = 0;
        let block = "default";
        const processPlugins = () => {
          let curplugins = block === "default" ? defaultPlugins : userPlugins;
          if (pos >= curplugins.length) {
            if (block === "default" && userPlugins.length) {
              block = "user";
              pos = 0;
              curplugins = userPlugins;
            } else {
              return callback();
            }
          }
          const plugin = curplugins[pos++];
          plugin(mail, (err) => {
            if (err) {
              return callback(err);
            }
            processPlugins();
          });
        };
        processPlugins();
      }
      /**
       * Sets up proxy handler for a Nodemailer object
       *
       * @param proxyUrl Proxy configuration url
       */
      setupProxy(proxyUrl) {
        const proxy = urllib.parse(proxyUrl);
        this.getSocket = (options, callback) => {
          const protocol = proxy.protocol.replace(/:$/, "").toLowerCase();
          const configuredTimeout = Number(this.options.connectionTimeout) || 0;
          const connectStartedAt = Number(options.connectStartedAt) || Date.now();
          const connectionTimeout = configuredTimeout ? Math.max(connectStartedAt + configuredTimeout - Date.now(), 1) : void 0;
          if (this.meta.has("proxy_handler_" + protocol)) {
            return this.meta.get("proxy_handler_" + protocol)(proxy, options, callback);
          }
          switch (protocol) {
            // Connect using a HTTP CONNECT method
            case "http":
            case "https":
              (0, http_proxy_client_js_1.default)(proxy.href, options.port, options.host, connectionTimeout ? Object.assign({}, this.options.tls, { timeout: connectionTimeout }) : this.options.tls || {}, (err2, socket) => {
                if (err2) {
                  return callback(err2);
                }
                return callback(null, {
                  connection: socket
                });
              });
              return;
            case "socks":
            case "socks5":
            case "socks4":
            case "socks4a": {
              if (!this.meta.has("proxy_socks_module")) {
                let err2 = new Error("Socks module not loaded");
                err2.code = errors.EPROXY;
                return callback(err2);
              }
              const connect = (ipaddress) => {
                const proxyV2 = !!this.meta.get("proxy_socks_module").SocksClient;
                const socksClient = proxyV2 ? this.meta.get("proxy_socks_module").SocksClient : this.meta.get("proxy_socks_module");
                const proxyType = Number(proxy.protocol.replace(/\D/g, "")) || 5;
                const connectionOpts = {
                  proxy: {
                    ipaddress,
                    port: Number(proxy.port),
                    type: proxyType
                  },
                  [proxyV2 ? "destination" : "target"]: {
                    host: options.host,
                    port: options.port
                  },
                  command: "connect"
                };
                if (connectionTimeout) {
                  connectionOpts.timeout = connectionTimeout;
                }
                if (proxy.username || proxy.password) {
                  const username = proxy.username || "";
                  const password = proxy.password || "";
                  if (proxyV2) {
                    connectionOpts.proxy.userId = username;
                    connectionOpts.proxy.password = password;
                  } else if (proxyType === 4) {
                    connectionOpts.userid = username;
                  } else {
                    connectionOpts.authentication = {
                      username,
                      password
                    };
                  }
                }
                socksClient.createConnection(connectionOpts, (err2, info) => {
                  if (err2) {
                    return callback(err2);
                  }
                  return callback(null, {
                    connection: info.socket || info
                  });
                });
              };
              if (node_net_1.default.isIP(proxy.hostname)) {
                return connect(proxy.hostname);
              }
              return node_dns_1.default.lookup(proxy.hostname, (err2, address) => {
                if (err2) {
                  return callback(err2);
                }
                connect(address);
              });
            }
          }
          let err = new Error("Unknown proxy configuration");
          err.code = errors.EPROXY;
          callback(err);
        };
      }
      /** @internal */
      _convertDataImages(mail, callback) {
        if (!this.options.attachDataUrls && !mail.data.attachDataUrls || !mail.data.html) {
          return callback();
        }
        mail.resolveContent(mail.data, "html", { disableFileAccess: mail.data.disableFileAccess, disableUrlAccess: mail.data.disableUrlAccess }, (err, html) => {
          if (err) {
            return callback(err);
          }
          let cidCounter = 0;
          html = (html || "").toString().replace(/(<img\b[^<>]{0,1024} src\s{0,20}=[\s"']{0,20})(data:([^;"'<>\s]{1,255});[^"'>\s]+)/gi, (match, prefix, dataUri, mimeType) => {
            const cid = node_crypto_1.default.randomBytes(10).toString("hex") + "@localhost";
            if (!mail.data.attachments) {
              mail.data.attachments = [];
            }
            if (!Array.isArray(mail.data.attachments)) {
              mail.data.attachments = [].concat(mail.data.attachments || []);
            }
            mail.data.attachments.push({
              path: dataUri,
              cid,
              filename: "image-" + ++cidCounter + "." + mimeTypes.detectExtension(mimeType)
            });
            return prefix + "cid:" + cid;
          });
          mail.data.html = html;
          callback();
        });
      }
      set(key, value) {
        return this.meta.set(key, value);
      }
      get(key) {
        return this.meta.get(key);
      }
    };
    exports2.default = Mail;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/smtp-connection/data-stream.js
var require_data_stream = __commonJS({
  "node_modules/nodemailer/dist/cjs/smtp-connection/data-stream.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_stream_1 = require("node:stream");
    var INSERT_LF = Buffer.from("\n");
    var INSERT_LF_DOT = Buffer.from("\n.");
    var INSERT_CR = Buffer.from("\r");
    var INSERT_DOT = Buffer.from(".");
    var DataStream = class extends node_stream_1.Transform {
      constructor(options) {
        super(options);
        this.options = options || {};
        this.inByteCount = 0;
        this.outByteCount = 0;
        this.lastByte = false;
      }
      /**
       * Escapes dots
       * @internal
       */
      _transform(chunk, encoding, done) {
        const chunks = [];
        let chunklen = 0;
        let i, len, lastPos = 0;
        let buf;
        if (!chunk || !chunk.length) {
          return done();
        }
        if (typeof chunk === "string") {
          chunk = Buffer.from(chunk);
        }
        this.inByteCount += chunk.length;
        for (i = 0, len = chunk.length; i < len; i++) {
          const byte = chunk[i];
          const prev = i ? chunk[i - 1] : this.lastByte;
          let insert = false;
          if (prev === 13 && byte !== 10) {
            insert = byte === 46 ? INSERT_LF_DOT : INSERT_LF;
          } else if (byte === 10 && prev !== 13) {
            insert = INSERT_CR;
          } else if (byte === 46 && (prev === 10 || prev === false)) {
            insert = INSERT_DOT;
          }
          if (insert) {
            if (i > lastPos) {
              buf = chunk.slice(lastPos, i);
              chunks.push(buf);
              chunklen += buf.length;
            }
            chunks.push(insert);
            chunklen += insert.length;
            lastPos = i;
          }
        }
        if (chunks.length) {
          if (lastPos < chunk.length) {
            buf = chunk.slice(lastPos);
            chunks.push(buf);
            chunklen += buf.length;
          }
          this.outByteCount += chunklen;
          this.push(Buffer.concat(chunks, chunklen));
        } else {
          this.outByteCount += chunk.length;
          this.push(chunk);
        }
        this.lastByte = chunk[chunk.length - 1];
        done();
      }
      /**
       * Finalizes the stream with a dot on a single line
       * @internal
       */
      _flush(done) {
        let buf;
        if (this.lastByte === 10) {
          buf = Buffer.from(".\r\n");
        } else if (this.lastByte === 13) {
          buf = Buffer.from("\n.\r\n");
        } else {
          buf = Buffer.from("\r\n.\r\n");
        }
        this.outByteCount += buf.length;
        this.push(buf);
        done();
      }
    };
    exports2.default = DataStream;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/smtp-connection/server-message-id.js
var require_server_message_id = __commonJS({
  "node_modules/nodemailer/dist/cjs/smtp-connection/server-message-id.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.parseServerMessageId = parseServerMessageId;
    var OUTLOOK_REPLY = /^250 2\.0\.0 OK (<[^<>\s]+\.prod\.outlook\.com>)/i;
    var SES_REPLY = /^250 Ok ([0-9a-f]+(?:-[0-9a-f]+)+)$/i;
    var AWS_REGION = /^[a-z]{2}(?:-[a-z]+)+-\d+$/;
    function sesRegion(host) {
      const labels = host.toLowerCase().replace(/\.$/, "").split(".");
      const domain = labels.slice(-2).join(".");
      if (domain !== "amazonaws.com" && domain !== "awsapps.com") {
        return void 0;
      }
      return labels.slice(0, -2).find((label) => AWS_REGION.test(label));
    }
    function parseServerMessageId(response, host) {
      const reply = (response || "").toString().trim();
      const outlook = reply.match(OUTLOOK_REPLY);
      if (outlook) {
        return outlook[1];
      }
      const ses = reply.match(SES_REPLY);
      if (ses && host) {
        const region = sesRegion(host);
        if (region) {
          return "<" + ses[1].toLowerCase() + "@" + (region === "us-east-1" ? "email" : region) + ".amazonses.com>";
        }
      }
      return void 0;
    }
  }
});

// node_modules/nodemailer/dist/cjs/smtp-connection/index.js
var require_smtp_connection = __commonJS({
  "node_modules/nodemailer/dist/cjs/smtp-connection/index.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var packageData = __importStar(require_package_info());
    var node_events_1 = require("node:events");
    var node_net_1 = __importDefault(require("node:net"));
    var node_tls_1 = __importDefault(require("node:tls"));
    var node_os_1 = __importDefault(require("node:os"));
    var node_crypto_1 = __importDefault(require("node:crypto"));
    var data_stream_js_1 = __importDefault(require_data_stream());
    var node_stream_1 = require("node:stream");
    var shared = __importStar(require_shared());
    var server_message_id_js_1 = require_server_message_id();
    var errors_js_1 = require_errors();
    var CONNECTION_TIMEOUT = 2 * 60 * 1e3;
    var SOCKET_TIMEOUT = 10 * 60 * 1e3;
    var GREETING_TIMEOUT = 30 * 1e3;
    var DNS_TIMEOUT = 30 * 1e3;
    var CLOSE_TIMEOUT = 5 * 1e3;
    var KEEPALIVE_DELAY = 30 * 1e3;
    var TEARDOWN_NOOP = () => {
    };
    function shuffle(list) {
      const result = list.slice();
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }
    function timeoutError(message, timeoutType) {
      const err = new Error(message);
      err.timeoutType = timeoutType;
      return err;
    }
    var MAX_RESPONSE_SIZE = 1024 * 1024;
    function decodeServerResponse(str2) {
      if (!str2) {
        return str2;
      }
      const utf8 = Buffer.from(str2, "binary").toString("utf8");
      return utf8.includes("\uFFFD") ? str2 : utf8;
    }
    function isPartialResponse(str2) {
      return isPartialLine(str2.slice(str2.lastIndexOf("\n") + 1));
    }
    function isPartialLine(line) {
      return /^\d+-/.test(line);
    }
    function maskAuthCommand(cmd) {
      const match = (cmd || "").toString().match(/^AUTH\s+[^\s]+/i);
      if (!match) {
        return "/* secret */";
      }
      return match[0].length === cmd.length ? cmd : match[0] + " /* secret */";
    }
    var SMTPConnection = class extends node_events_1.EventEmitter {
      constructor(options) {
        super(options);
        this.id = node_crypto_1.default.randomBytes(8).toString("base64").replace(/\W/g, "");
        this.stage = "init";
        this.options = options || {};
        if (this.options.requireTLS && (this.options.ignoreTLS || this.options.opportunisticTLS)) {
          this.options = Object.assign({}, this.options, { ignoreTLS: false, opportunisticTLS: false });
        }
        this.secureConnection = !!this.options.secure;
        this.alreadySecured = !!this.options.secured;
        this.port = Number(this.options.port) || (this.secureConnection ? 465 : 587);
        this.host = this.options.host || "localhost";
        this.servername = this.options.servername ? this.options.servername : !node_net_1.default.isIP(this.host) ? this.host : false;
        this.allowInternalNetworkInterfaces = this.options.allowInternalNetworkInterfaces || false;
        if (typeof this.options.secure === "undefined" && this.port === 465) {
          this.secureConnection = true;
        }
        this.name = (this.options.name || this._getHostname()).toString().replace(/[\r\n]+/g, "");
        this.logger = shared.getLogger(this.options, {
          component: this.options.component || "smtp-connection",
          sid: this.id
        });
        this.customAuth = /* @__PURE__ */ new Map();
        for (const key of Object.keys(this.options.customAuth || {})) {
          const mapKey = (key || "").toString().trim().toUpperCase();
          if (mapKey) {
            this.customAuth.set(mapKey, this.options.customAuth[key]);
          }
        }
        this.version = packageData.version;
        this.authenticated = false;
        this.destroyed = false;
        this.secure = !!this.secureConnection;
        this._remainder = "";
        this._responseQueue = [];
        this._responsePartial = false;
        this.lastServerResponse = false;
        this._socket = false;
        this._supportedAuth = [];
        this.allowsAuth = false;
        this._envelope = false;
        this._supportedExtensions = [];
        this._maxAllowedSize = 0;
        this._responseActions = [];
        this._recipientQueue = [];
        this._phaseTimer = false;
        this._plaintextEhlo = false;
        this._destroyed = false;
        this._closing = false;
        this._currentDataStream = false;
        this._pendingSend = false;
        this._connectCallback = false;
        this._onSocketData = (chunk) => this._onData(chunk);
        this._onSocketError = (error) => this._onError(error, "ESOCKET", false, "CONN");
        this._onSocketClose = () => this._onClose();
        this._onSocketEnd = () => this._onEnd();
        this._onSocketTimeout = () => this._onTimeout();
        this._onConnectionSocketError = (err) => this._onError(err, "ESOCKET", false, "CONN");
      }
      /**
       * Creates a connection to a SMTP server and sets up connection
       * listener
       */
      connect(connectCallback) {
        if (this._connectCalled && !this._destroyed) {
          const err = this._formatError("Cannot connect - connect() was already called for this connection", "ECONNECTION", false, "API");
          if (typeof connectCallback === "function") {
            setImmediate(() => connectCallback(err));
            return;
          }
          this.logger.warn({ tnx: "smtp" }, "%s", err.message);
          return;
        }
        this._connectCalled = true;
        if (typeof connectCallback === "function") {
          this._connectCallback = connectCallback;
          this.once("connect", () => {
            this._connectCallback = false;
            this.logger.debug({
              tnx: "smtp"
            }, "SMTP handshake finished");
            connectCallback();
          });
          const isDestroyedMessage = this._isDestroyedMessage("connect");
          if (isDestroyedMessage) {
            return connectCallback(this._formatError(isDestroyedMessage, "ECONNECTION", false, "CONN"));
          }
        }
        const connectionTimeout = this.options.connectionTimeout || CONNECTION_TIMEOUT;
        this._connectionDeadline = (this._connectStartedAt || Date.now()) + connectionTimeout;
        let opts = {
          port: this.port,
          host: this.host,
          allowInternalNetworkInterfaces: this.allowInternalNetworkInterfaces,
          timeout: Math.min(this.options.dnsTimeout || DNS_TIMEOUT, connectionTimeout)
        };
        if (this.options.localAddress) {
          opts.localAddress = this.options.localAddress;
        }
        if (this.options.connection) {
          this._socket = this.options.connection;
          this._setupConnectionHandlers();
          if (this.secureConnection && !this.alreadySecured) {
            setImmediate(() => this._upgradeConnection((err) => {
              if (err) {
                this._onError(new Error("Error initiating TLS - " + (err.message || err)), "ETLS", false, "CONN");
                return;
              }
              this._onConnect();
            }));
          } else {
            setImmediate(() => this._onConnect());
          }
          return;
        } else if (this.options.socket) {
          this._socket = this.options.socket;
          return this._resolveAndConnect(opts, (_resolved) => {
            try {
              this._socket.connect(this.port, this.host, () => {
                if (this.secureConnection && !this.alreadySecured) {
                  return this._upgradeConnection((err) => {
                    if (err) {
                      this._onError(new Error("Error initiating TLS - " + (err.message || err)), "ETLS", false, "CONN");
                      return;
                    }
                    this._onConnect();
                  });
                }
                this._onConnect();
              });
              this._setupConnectionHandlers();
            } catch (E) {
              setImmediate(() => this._onError(E, "ECONNECTION", false, "CONN"));
              return;
            }
          });
        } else {
          if (this.secureConnection) {
            Object.assign(opts, this.options.tls || {});
            if (this.servername && !opts.servername) {
              opts.servername = this.servername;
            }
          }
          return this._resolveAndConnect(opts, (resolved) => {
            let addresses = resolved._addresses || [];
            if (opts.localAddress) {
              const localFamily = node_net_1.default.isIPv6(opts.localAddress) ? 6 : 4;
              const sameFamily = addresses.filter((addr) => node_net_1.default.isIP(addr) === localFamily);
              addresses = sameFamily.length ? sameFamily : addresses;
            }
            if (addresses.length > 1) {
              const ipv6 = addresses.filter((addr) => node_net_1.default.isIPv6(addr));
              const ipv4 = addresses.filter((addr) => !node_net_1.default.isIPv6(addr));
              const ordered = shuffle(ipv6).concat(shuffle(ipv4));
              opts.host = this.host;
              opts.autoSelectFamily = true;
              if (!ipv6.length || !ipv4.length) {
                const remaining = this._connectionDeadline - Date.now();
                opts.autoSelectFamilyAttemptTimeout = Math.max(Math.floor(remaining / ordered.length), 10);
              }
              opts.lookup = (hostname, lookupOptions, callback) => {
                if (lookupOptions && lookupOptions.all) {
                  const all = ordered.map((address) => ({ address, family: node_net_1.default.isIPv6(address) ? 6 : 4 }));
                  return setImmediate(() => callback(null, all));
                }
                setImmediate(() => callback(null, ordered[0], node_net_1.default.isIPv6(ordered[0]) ? 6 : 4));
              };
            } else if (addresses.length) {
              opts.host = addresses[0];
            }
            this._connectToHost(opts, this.secureConnection);
          });
        }
      }
      /**
       * Resolves the hostname and applies resolved values to opts,
       * then calls the provided callback with the resolved data
       *
       * @param opts Connection options (modified in place)
       * @param callback Called with resolved data on success
       * @internal
       */
      _resolveAndConnect(opts, callback) {
        return shared.resolveHostname(opts, (err, resolved) => {
          if (err) {
            return setImmediate(() => this._onError(err, "EDNS", false, "CONN"));
          }
          this.logger.debug({
            tnx: "dns",
            source: opts.host,
            resolved: resolved.host,
            cached: !!resolved.cached
          }, "Resolved %s as %s [cache %s]", opts.host, resolved.host, resolved.cached ? "hit" : "miss");
          for (const key of Object.keys(resolved)) {
            if (key.charAt(0) !== "_" && resolved[key]) {
              opts[key] = resolved[key];
            }
          }
          callback(resolved);
        });
      }
      /**
       * Attempts to connect to the specified host address
       *
       * @param opts Connection options
       * @param secure Whether to use TLS
       * @internal
       */
      _connectToHost(opts, secure) {
        if (this._destroyed || this._closing) {
          return;
        }
        const connectFn = secure ? node_tls_1.default.connect : node_net_1.default.connect;
        try {
          this._socket = connectFn(opts, () => this._onConnect());
          this._setupConnectionHandlers();
        } catch (E) {
          setImmediate(() => this._onError(E, "ECONNECTION", false, "CONN"));
          return;
        }
      }
      /**
       * Sets up connection timeout and error handlers
       * @internal
       */
      _setupConnectionHandlers() {
        this._startPhase(Math.max((this._connectionDeadline || Date.now()) - Date.now(), 0), timeoutError("Connection timeout", "CONNECT_TIMEOUT"));
        this._socket.on("error", this._onConnectionSocketError);
      }
      /**
       * Starts the timer of a connection phase: connecting, waiting for the greeting or a TLS
       * upgrade. The phases follow one another, so starting one ends the one before
       *
       * @param timeout Time the phase may take
       * @param err Error to fail with when it takes longer
       * @internal
       */
      _startPhase(timeout, err) {
        this._clearPhase();
        this._phaseTimer = setTimeout(() => {
          this._phaseTimer = false;
          this._onError(err, "ETIMEDOUT", false, "CONN");
        }, timeout);
      }
      /**
       * Time the greeting or a STARTTLS upgrade may take: greetingTimeout, cut short by what is left
       * of connectionTimeout
       *
       * @internal
       */
      _remainingSetupTime() {
        return Math.min(this.options.greetingTimeout || GREETING_TIMEOUT, Math.max((this._connectionDeadline || Infinity) - Date.now(), 1));
      }
      /** @internal */
      _clearPhase() {
        clearTimeout(this._phaseTimer);
        this._phaseTimer = false;
      }
      /**
       * Sends QUIT
       */
      quit() {
        this._sendCommand("QUIT");
        this._responseActions.push(this.close);
      }
      /**
       * Closes the connection to the server
       */
      close() {
        this._clearPhase();
        this._responseActions = [];
        if (this._closing) {
          return;
        }
        this._closing = true;
        const closeMethod = this.stage === "init" ? "destroy" : "end";
        this.logger.debug({
          tnx: "smtp"
        }, 'Closing connection to the server using "%s"', closeMethod);
        const socket = this._socket && this._socket.socket || this._socket;
        if (this._currentDataStream) {
          try {
            this._currentDataStream.unpipe(this._socket);
          } catch (_E) {
          }
          this._currentDataStream = false;
        }
        if (this._pendingSend) {
          const { stream, onStreamError } = this._pendingSend;
          if (stream) {
            stream.removeListener("error", onStreamError);
            stream.on("error", TEARDOWN_NOOP);
            stream.destroy();
          }
          this._pendingSend = false;
        }
        if (socket && !socket.destroyed) {
          try {
            socket.setTimeout(0);
            socket.removeListener("data", this._onSocketData);
            socket.removeListener("timeout", this._onSocketTimeout);
            socket.removeListener("close", this._onSocketClose);
            socket.removeListener("end", this._onSocketEnd);
            socket.removeListener("error", this._onSocketError);
            socket.removeListener("error", this._onConnectionSocketError);
            socket.on("error", TEARDOWN_NOOP);
            socket[closeMethod]();
            if (closeMethod === "end") {
              const closeTimer = setTimeout(() => socket.destroy(), CLOSE_TIMEOUT);
              if (typeof closeTimer.unref === "function") {
                closeTimer.unref();
              }
              socket.once("close", () => clearTimeout(closeTimer));
            }
          } catch (_E) {
          }
        }
        this._destroy();
      }
      /**
       * Authenticate user
       */
      login(authData, callback) {
        const isDestroyedMessage = this._isDestroyedMessage("login");
        if (isDestroyedMessage) {
          return callback(this._formatError(isDestroyedMessage, "ECONNECTION", false, "API"));
        }
        this._auth = authData || {};
        this._authMethod = (this._auth.method || "").toString().trim().toUpperCase() || false;
        const canUseXOAuth2 = !!this._auth.oauth2 || this.customAuth.has("XOAUTH2");
        if (!this._authMethod && this._auth.oauth2 && !this._auth.credentials) {
          this._authMethod = "XOAUTH2";
        } else if (!this._authMethod || this._authMethod === "XOAUTH2" && !this._auth.oauth2) {
          const supported = this._supportedAuth.find((method) => method !== "XOAUTH2" || canUseXOAuth2);
          this._authMethod = (supported || "PLAIN").toUpperCase().trim();
        }
        if ((this._authMethod !== "XOAUTH2" || this.customAuth.has("XOAUTH2")) && (!this._auth.credentials || !this._auth.credentials.user || !this._auth.credentials.pass)) {
          if (this._auth.user && this._auth.pass || this.customAuth.has(this._authMethod)) {
            this._auth.credentials = {
              user: this._auth.user,
              pass: this._auth.pass,
              options: this._auth.options
            };
          } else {
            return callback(this._formatError('Missing credentials for "' + this._authMethod + '"', "EAUTH", false, "API"));
          }
        }
        if (this.customAuth.has(this._authMethod)) {
          const handler = this.customAuth.get(this._authMethod);
          let lastResponse;
          let returned = false;
          const resolve = () => {
            if (returned) {
              return;
            }
            returned = true;
            this.logger.info({
              tnx: "smtp",
              username: this._auth.user,
              action: "authenticated",
              method: this._authMethod
            }, "User %s authenticated", JSON.stringify(this._auth.user));
            this.authenticated = true;
            callback(null, true);
          };
          const reject = (err) => {
            if (returned) {
              return;
            }
            returned = true;
            callback(this._formatError(err, "EAUTH", lastResponse, "AUTH " + this._authMethod));
          };
          const sendCommand = (cmd, done) => {
            let promise;
            if (!done) {
              promise = new Promise((resolve2, reject2) => {
                done = shared.callbackPromise(resolve2, reject2);
              });
            }
            this._responseActions.push((str2) => {
              lastResponse = str2;
              let codes = str2.match(/^(\d+)(?:\s(\d+\.\d+\.\d+))?\s/);
              let data = {
                command: cmd,
                response: str2
              };
              if (codes) {
                data.status = Number(codes[1]) || 0;
                if (codes[2]) {
                  data.code = codes[2];
                }
                data.text = str2.substr(codes[0].length);
              } else {
                data.text = str2;
                data.status = 0;
              }
              done(null, data);
            });
            setImmediate(() => this._sendCommand(cmd, maskAuthCommand(cmd)));
            return promise;
          };
          const handlerResponse = handler({
            auth: this._auth,
            method: this._authMethod,
            extensions: [].concat(this._supportedExtensions),
            authMethods: [].concat(this._supportedAuth),
            maxAllowedSize: this._maxAllowedSize || false,
            sendCommand,
            resolve,
            reject
          });
          if (handlerResponse && typeof handlerResponse.catch === "function") {
            handlerResponse.then(resolve).catch(reject);
          }
          return;
        }
        switch (this._authMethod) {
          case "XOAUTH2":
            this._handleXOauth2Token(false, callback);
            return;
          case "LOGIN":
            this._responseActions.push((str2) => {
              this._actionAUTH_LOGIN_USER(str2, callback);
            });
            this._sendCommand("AUTH LOGIN");
            return;
          case "PLAIN":
            this._responseActions.push((str2) => {
              this._actionAUTHComplete(str2, callback);
            });
            this._sendCommand(
              "AUTH PLAIN " + Buffer.from(
                //this._auth.user+'\u0000'+
                "\0" + // skip authorization identity as it causes problems with some servers
                this._auth.credentials.user + "\0" + this._auth.credentials.pass,
                "utf-8"
              ).toString("base64"),
              // log entry without passwords
              "AUTH PLAIN " + Buffer.from(
                //this._auth.user+'\u0000'+
                "\0" + // skip authorization identity as it causes problems with some servers
                this._auth.credentials.user + "\0/* secret */",
                "utf-8"
              ).toString("base64")
            );
            return;
          case "CRAM-MD5":
            this._responseActions.push((str2) => {
              this._actionAUTH_CRAM_MD5(str2, callback);
            });
            this._sendCommand("AUTH CRAM-MD5");
            return;
        }
        return callback(this._formatError('Unknown authentication method "' + this._authMethod + '"', "EAUTH", false, "API"));
      }
      /**
       * Sends a message
       *
       * @param envelope Envelope object, {from: addr, to: [addr]}
       * @param message String, Buffer or a Stream
       * @param done Callback to return once sending is completed
       */
      send(envelope, message, done) {
        let returned = false;
        const callback = (err, info) => {
          if (returned) {
            return;
          }
          returned = true;
          if (this._pendingSend && this._pendingSend.callback === callback) {
            this._pendingSend = false;
          }
          done(err, info);
        };
        if (!message) {
          return callback(this._formatError("Empty message", "EMESSAGE", false, "API"));
        }
        const isDestroyedMessage = this._isDestroyedMessage("send message");
        if (isDestroyedMessage) {
          return callback(this._formatError(isDestroyedMessage, "ECONNECTION", false, "API"));
        }
        if (this._maxAllowedSize && envelope.size > this._maxAllowedSize) {
          setImmediate(() => {
            callback(this._formatError("Message size larger than allowed " + this._maxAllowedSize, "EMESSAGE", false, "MAIL FROM"));
          });
          return;
        }
        const pendingSend = {
          callback,
          stream: false,
          onStreamError: (err) => callback(this._formatError(err, "ESTREAM", false, "API"))
        };
        if (typeof message.on === "function") {
          pendingSend.stream = message;
          pendingSend.stream.on("error", pendingSend.onStreamError);
        }
        this._pendingSend = pendingSend;
        const startTime = Date.now();
        this._setEnvelope(envelope, (err, info) => {
          if (err) {
            if (typeof message.destroy === "function") {
              message.destroy();
            }
            return callback(err);
          }
          const envelopeTime = Date.now();
          const stream = this._createSendStream((err2, str2) => {
            if (err2) {
              return callback(err2);
            }
            const result = info;
            result.envelopeTime = envelopeTime - startTime;
            result.messageTime = Date.now() - envelopeTime;
            result.messageSize = stream.outByteCount;
            result.response = str2;
            const serverMessageId = (0, server_message_id_js_1.parseServerMessageId)(result.response, this.options.host);
            if (serverMessageId) {
              result.serverMessageId = serverMessageId;
            }
            const rejectedErrors = this._envelope?.rejectedErrors;
            if (!result.rejectedErrors && rejectedErrors && rejectedErrors.length) {
              result.rejectedErrors = rejectedErrors;
            }
            return callback(null, result);
          });
          if (typeof message.pipe === "function") {
            message.pipe(stream);
          } else {
            stream.write(message);
            stream.end();
          }
        });
      }
      /**
       * Resets connection state
       *
       * @param callback Callback to return once connection is reset
       */
      reset(callback) {
        const isDestroyedMessage = this._isDestroyedMessage("reset");
        if (isDestroyedMessage) {
          return callback(this._formatError(isDestroyedMessage, "ECONNECTION", false, "API"));
        }
        this._sendCommand("RSET");
        this._responseActions.push((str2) => {
          if (str2.charAt(0) !== "2") {
            return callback(this._formatError("Could not reset session state. response=" + str2, "EPROTOCOL", str2, "RSET"));
          }
          this._envelope = false;
          return callback(null, true);
        });
      }
      /**
       * Connection listener that is run when the connection to
       * the server is opened
       *
       * @event
       * @internal
       */
      _onConnect() {
        const socket = this._socket;
        this._clearPhase();
        this.logger.info({
          tnx: "network",
          localAddress: socket.localAddress,
          localPort: socket.localPort,
          remoteAddress: socket.remoteAddress,
          remotePort: socket.remotePort
        }, "%s established to %s:%s", this.secure ? "Secure connection" : "Connection", socket.remoteAddress, socket.remotePort);
        if (this._destroyed) {
          this.close();
          return;
        }
        this.stage = "connected";
        socket.removeListener("data", this._onSocketData);
        socket.removeListener("timeout", this._onSocketTimeout);
        socket.removeListener("close", this._onSocketClose);
        socket.removeListener("end", this._onSocketEnd);
        socket.removeListener("error", this._onConnectionSocketError);
        socket.removeListener("error", this._onSocketError);
        socket.on("error", this._onSocketError);
        socket.on("data", this._onSocketData);
        socket.once("close", this._onSocketClose);
        socket.once("end", this._onSocketEnd);
        socket.setTimeout(this.options.socketTimeout || SOCKET_TIMEOUT);
        socket.on("timeout", this._onSocketTimeout);
        if (typeof socket.setKeepAlive === "function") {
          socket.setKeepAlive(true, KEEPALIVE_DELAY);
        }
        if (typeof socket.setNoDelay === "function") {
          socket.setNoDelay(true);
        }
        this._startPhase(this._remainingSetupTime(), timeoutError("Greeting never received", "GREETING_TIMEOUT"));
        this._responseActions.push(this._actionGreeting);
        socket.resume();
      }
      /**
       * Ends the session after a 421 reply. The replies queued for commands sent along with the
       * answered one are not going to come, so the message in flight is failed here
       *
       * @param str The 421 reply
       * @internal
       */
      _onServerClosing(str2) {
        if (this._destroyed) {
          return;
        }
        const pendingSend = this._pendingSend;
        const envelope = this._envelope;
        this._responseActions = [];
        this.close();
        if (pendingSend) {
          pendingSend.callback(envelope && envelope.mailError || this._formatError("Server closed the connection", "ECONNECTION", str2, "CONN"));
        }
      }
      /**
       * 'data' listener for data coming from the server
       *
       * @event
       * @param chunk Data chunk coming from the server
       * @internal
       */
      _onData(chunk) {
        if (this._destroyed || !chunk || !chunk.length) {
          return;
        }
        const maxResponseSize = this.options.maxResponseSize || MAX_RESPONSE_SIZE;
        const data = chunk.toString("binary");
        if (!data.includes("\n")) {
          this._remainder += data;
          if (this._remainder.length > maxResponseSize) {
            return this._onResponseTooLarge();
          }
          return;
        }
        const lines = (this._remainder + data).split(/\r?\n/);
        this._remainder = lines.pop();
        for (let i = 0, len = lines.length; i < len; i++) {
          if (this._responsePartial) {
            this._responseQueue[this._responseQueue.length - 1] += "\n" + lines[i];
          } else {
            this._responseQueue.push(lines[i]);
          }
          this._responsePartial = isPartialLine(lines[i]);
          if (this._responsePartial && this._responseQueue[this._responseQueue.length - 1].length > maxResponseSize) {
            return this._onResponseTooLarge();
          }
        }
        if (this._remainder.length > maxResponseSize) {
          return this._onResponseTooLarge();
        }
        if (this._responsePartial) {
          return;
        }
        this._processResponse();
      }
      /**
       * Drops a connection whose peer keeps extending a reply it never completes, releasing
       * whatever was buffered for that reply
       * @internal
       */
      _onResponseTooLarge() {
        this._remainder = "";
        this._responseQueue = [];
        this._responsePartial = false;
        this._onError(new Error("Server response exceeds maximum allowed size"), "EPROTOCOL", false, "CONN");
      }
      /**
       * 'error' listener for the socket
       *
       * @event
       * @param err Error object
       * @param type Error name
       * @param data Server response that triggered the error, false if there is none
       * @param command SMTP command that was in flight
       * @internal
       */
      _onError(err, type, data, command) {
        this._clearPhase();
        if (this._destroyed) {
          return;
        }
        err = this._formatError(err, type, data, command);
        if ((0, errors_js_1.isTransientError)(err)) {
          this.logger.warn({ tnx: "smtp", err }, "%s", err.message);
        } else {
          this.logger.error({ tnx: "smtp", err }, "%s", err.message);
        }
        const pendingSend = this._pendingSend;
        this.emit("error", err);
        this.close();
        if (pendingSend) {
          pendingSend.callback(err);
        }
      }
      /** @internal */
      _formatError(message, type, response, command) {
        let err;
        if (/Error\]$/i.test(Object.prototype.toString.call(message))) {
          err = message;
        } else {
          err = new Error(message);
        }
        if (type && type !== "Error" && err.code !== errors_js_1.ERR_ACCESS_DENIED) {
          if (err.code && err.code !== type && !err.originalCode) {
            err.originalCode = err.code;
          }
          err.code = type;
        }
        if (response) {
          err.response = response;
          err.message += ": " + response;
        }
        const responseCode = typeof response === "string" && Number((response.match(/^\d+/) || [])[0]) || false;
        if (responseCode) {
          err.responseCode = responseCode;
          err.permanent = (0, errors_js_1.isPermanentResponseCode)(responseCode);
        }
        if (command) {
          err.command = command;
        }
        return err;
      }
      /**
       * 'close' listener for the socket
       *
       * @event
       * @internal
       */
      _onClose() {
        let serverResponse = false;
        if (this._remainder && this._remainder.trim()) {
          this.lastServerResponse = serverResponse = decodeServerResponse(this._remainder.trim());
          if (this.options.debug || this.options.transactionLog) {
            this.logger.debug({
              tnx: "server"
            }, serverResponse);
          }
        }
        this.logger.info({
          tnx: "network"
        }, "Connection closed");
        const failureResponse = typeof serverResponse === "string" && /^[45]\d{2}[ -]/.test(serverResponse) ? serverResponse : false;
        if (this.upgrading && !this._destroyed) {
          return this._onError(new Error("Connection closed unexpectedly"), "ETLS", failureResponse, "CONN");
        }
        if (!failureResponse && this._responseActions[0] === this._actionGreeting && this._connectCallback && !this._destroyed) {
          const connectCallback = this._connectCallback;
          this._connectCallback = false;
          const err = this._formatError(new Error("Connection closed unexpectedly"), "ECONNECTION", false, "CONN");
          this.logger.warn({ tnx: "network" }, err.message);
          connectCallback(err);
          this.close();
          return;
        }
        if (!failureResponse && this.stage === "connected" && !this._responseActions.length && !this._pendingSend && !this._destroyed && !this._closing) {
          this.logger.info({
            tnx: "network"
          }, "Server closed the idle connection");
          return this._destroy();
        }
        if (failureResponse || this._responseActions[0] !== this.close && !this._destroyed) {
          return this._onError(new Error("Connection closed unexpectedly"), "ECONNECTION", failureResponse, "CONN");
        }
        this._destroy();
      }
      /**
       * 'end' listener for the socket
       *
       * @event
       * @internal
       */
      _onEnd() {
        if (this._socket && !this._socket.destroyed) {
          this._socket.end();
        }
      }
      /**
       * 'timeout' listener for the socket
       *
       * @event
       * @internal
       */
      _onTimeout() {
        return this._onError(timeoutError("Timeout", "SOCKET_TIMEOUT"), "ETIMEDOUT", false, "CONN");
      }
      /**
       * Destroys the client, emits 'end'
       * @internal
       */
      _destroy() {
        if (this._destroyed) {
          return;
        }
        this._destroyed = true;
        this.destroyed = true;
        this._clearPhase();
        this.emit("end");
      }
      /**
       * Upgrades the connection to TLS
       *
       * @param callback Callback function to run when the connection
       *        has been secured
       * @internal
       */
      _upgradeConnection(callback) {
        const discarded = this._remainder.length + this._responseQueue.reduce((total, response) => total + response.length, 0);
        if (discarded) {
          this.logger.warn({
            tnx: "smtp",
            discarded
          }, "Discarded %s bytes received in plaintext after the STARTTLS response", discarded);
        }
        this._plaintextEhlo = false;
        this._remainder = "";
        this._responseQueue = [];
        this._responsePartial = false;
        const socketPlain = this._socket;
        socketPlain.removeListener("data", this._onSocketData);
        socketPlain.removeListener("timeout", this._onSocketTimeout);
        socketPlain.setTimeout(0);
        const opts = Object.assign({
          socket: socketPlain,
          host: this.host
        }, this.options.tls || {});
        if (this.servername && !opts.servername) {
          opts.servername = this.servername;
        }
        const removePlainSocketListeners = () => {
          socketPlain.removeListener("close", this._onSocketClose);
          socketPlain.removeListener("end", this._onSocketEnd);
          socketPlain.removeListener("error", this._onSocketError);
          socketPlain.removeListener("error", this._onConnectionSocketError);
        };
        this.upgrading = true;
        this._startPhase(this._remainingSetupTime(), timeoutError("TLS handshake timed out", "UPGRADE_TIMEOUT"));
        try {
          this._socket = node_tls_1.default.connect(opts, () => {
            this._clearPhase();
            this.secure = true;
            this.upgrading = false;
            this._socket.on("data", this._onSocketData);
            removePlainSocketListeners();
            return callback(null, true);
          });
        } catch (err) {
          this._clearPhase();
          removePlainSocketListeners();
          return callback(err);
        }
        this._socket.on("error", this._onSocketError);
        this._socket.once("close", this._onSocketClose);
        this._socket.once("end", this._onSocketEnd);
        this._socket.setTimeout(this.options.socketTimeout || SOCKET_TIMEOUT);
        this._socket.on("timeout", this._onSocketTimeout);
        socketPlain.resume();
      }
      /**
       * Processes queued responses from the server
       * @internal
       */
      _processResponse() {
        if (!this._responseQueue.length) {
          return false;
        }
        const raw = (this._responseQueue.shift() || "").toString();
        if (!raw.trim()) {
          setImmediate(() => this._processResponse());
          return;
        }
        if (isPartialResponse(raw)) {
          this._responseQueue.unshift(raw);
          return;
        }
        const str2 = this.lastServerResponse = decodeServerResponse(raw);
        if (this.options.debug || this.options.transactionLog) {
          this.logger.debug({
            tnx: "server"
          }, str2.replace(/\r?\n$/, ""));
        }
        const action = this._responseActions.shift();
        const closing = /^421[ -]/.test(str2);
        if (typeof action === "function") {
          action.call(this, str2);
          if (closing) {
            return this._onServerClosing(str2);
          }
          setImmediate(() => this._processResponse());
        } else if (closing && !this._pendingSend && this.stage === "connected") {
          this.logger.info({
            tnx: "smtp"
          }, "Server closed the idle connection: %s", str2);
          this.close();
        } else {
          return this._onError(new Error("Unexpected Response"), "EPROTOCOL", str2, "CONN");
        }
      }
      /**
       * Send a command to the server, append \r\n
       *
       * @param str String to be sent to the server
       * @param logStr Optional string to be used for logging instead of the actual string
       * @internal
       */
      _sendCommand(str2, logStr) {
        if (this._destroyed) {
          return;
        }
        const socket = this._socket;
        if (socket.destroyed) {
          return this.close();
        }
        if (this.options.debug || this.options.transactionLog) {
          this.logger.debug({
            tnx: "client"
          }, (logStr || str2 || "").toString().replace(/\r?\n$/, ""));
        }
        socket.write(Buffer.from(str2 + "\r\n", "utf-8"));
      }
      /**
       * Initiates a new message by submitting envelope data, starting with
       * MAIL FROM: command
       *
       * @param envelope Envelope object in the form of
       *        {from:'...', to:['...']}
       *        or
       *        {from:{address:'...',name:'...'}, to:[address:'...',name:'...']}
       * @param callback Callback to run once the envelope is processed
       * @internal
       */
      _setEnvelope(envelope, callback) {
        const args = [];
        let useSmtpUtf8 = false;
        this._envelope = envelope || {};
        this._envelope.from = (this._envelope.from && this._envelope.from.address || this._envelope.from || "").toString().trim();
        this._envelope.to = [].concat(this._envelope.to || []).map((to) => (to && to.address || to || "").toString().trim());
        if (!this._envelope.to.length) {
          return callback(this._formatError("No recipients defined", "EENVELOPE", false, "API"));
        }
        if (this._envelope.from && /[\r\n<>]/.test(this._envelope.from)) {
          return callback(this._formatError("Invalid sender " + JSON.stringify(this._envelope.from), "EENVELOPE", false, "API"));
        }
        if (/[\x80-\uFFFF]/.test(this._envelope.from)) {
          useSmtpUtf8 = true;
        }
        for (let i = 0, len = this._envelope.to.length; i < len; i++) {
          if (!this._envelope.to[i] || /[\r\n<>]/.test(this._envelope.to[i])) {
            return callback(this._formatError("Invalid recipient " + JSON.stringify(this._envelope.to[i]), "EENVELOPE", false, "API"));
          }
          if (/[\x80-\uFFFF]/.test(this._envelope.to[i])) {
            useSmtpUtf8 = true;
          }
        }
        this._envelope.rcptQueue = [].concat(this._envelope.to || []);
        this._envelope.rejected = [];
        this._envelope.rejectedErrors = [];
        this._envelope.accepted = [];
        if (this._envelope.dsn) {
          try {
            this._envelope.dsn = this._setDsnEnvelope(this._envelope.dsn);
          } catch (err) {
            return callback(this._formatError("Invalid DSN " + err.message, "EENVELOPE", false, "API"));
          }
        }
        if (this._envelope.requireTLSExtensionEnabled) {
          if (!this.secure) {
            return callback(this._formatError("REQUIRETLS can only be used over TLS connections (RFC 8689)", "EREQUIRETLS", false, "MAIL FROM"));
          }
          if (!this._supportedExtensions.includes("REQUIRETLS")) {
            return callback(this._formatError("Server does not support REQUIRETLS extension (RFC 8689)", "EREQUIRETLS", false, "MAIL FROM"));
          }
        }
        this._envelope.pipelined = this._supportedExtensions.includes("PIPELINING");
        this._responseActions.push((str2) => {
          this._actionMAIL(str2, callback);
        });
        if (useSmtpUtf8 && this._supportedExtensions.includes("SMTPUTF8")) {
          args.push("SMTPUTF8");
          this._usingSmtpUtf8 = true;
        }
        if (this._envelope.use8BitMime && this._supportedExtensions.includes("8BITMIME")) {
          args.push("BODY=8BITMIME");
          this._using8BitMime = true;
        }
        if (this._envelope.size && this._supportedExtensions.includes("SIZE")) {
          const sizeValue = Number(this._envelope.size) || 0;
          if (sizeValue > 0) {
            args.push("SIZE=" + sizeValue);
          }
        }
        if (this._envelope.dsn && this._supportedExtensions.includes("DSN")) {
          if (this._envelope.dsn.ret) {
            args.push("RET=" + shared.encodeXText(this._envelope.dsn.ret));
          }
          if (this._envelope.dsn.envid) {
            args.push("ENVID=" + shared.encodeXText(this._envelope.dsn.envid));
          }
        }
        if (this._envelope.requireTLSExtensionEnabled) {
          args.push("REQUIRETLS");
        }
        const mailFrom = "MAIL FROM:<" + this._envelope.from + ">" + (args.length ? " " + args.join(" ") : "");
        this._recipientQueue = [];
        if (!this._envelope.pipelined) {
          this._sendCommand(mailFrom);
          return;
        }
        const socket = this._socket;
        socket.cork();
        this._sendCommand(mailFrom);
        while (this._envelope.rcptQueue.length) {
          this._sendRcpt(this._envelope.rcptQueue.shift(), callback);
        }
        this._responseActions.push((str2) => {
          this._actionDATA(str2, callback);
        });
        this._sendCommand("DATA");
        socket.uncork();
      }
      /**
       * Sends RCPT TO for a recipient and queues the handler for the reply
       *
       * @param recipient Recipient address
       * @param callback Callback to run once the envelope is processed
       * @internal
       */
      _sendRcpt(recipient, callback) {
        this._recipientQueue.push(recipient);
        this._responseActions.push((str2) => {
          this._actionRCPT(str2, callback);
        });
        this._sendCommand("RCPT TO:<" + recipient + ">" + this._getDsnRcptToArgs());
      }
      /** @internal */
      _setDsnEnvelope(params) {
        let ret = (params.ret || params.return || "").toString().toUpperCase() || null;
        if (ret) {
          switch (ret) {
            case "HDRS":
            case "HEADERS":
              ret = "HDRS";
              break;
            case "FULL":
            case "BODY":
              ret = "FULL";
              break;
          }
        }
        if (ret && !["FULL", "HDRS"].includes(ret)) {
          throw new Error("ret: " + JSON.stringify(ret));
        }
        const envid = (params.envid || params.id || "").toString() || null;
        let notify = params.notify || null;
        if (notify) {
          if (typeof notify === "string") {
            notify = notify.split(",");
          }
          notify = notify.map((n) => n.trim().toUpperCase());
          const validNotify = ["NEVER", "SUCCESS", "FAILURE", "DELAY"];
          const invalidNotify = notify.filter((n) => !validNotify.includes(n));
          if (invalidNotify.length || notify.length > 1 && notify.includes("NEVER")) {
            throw new Error("notify: " + JSON.stringify(notify.join(",")));
          }
          notify = notify.join(",");
        }
        let orcpt = (params.recipient || params.orcpt || "").toString() || null;
        if (orcpt && orcpt.indexOf(";") < 0) {
          orcpt = "rfc822;" + orcpt;
        }
        return {
          ret,
          envid,
          notify,
          orcpt
        };
      }
      /** @internal */
      _getDsnRcptToArgs() {
        const envelope = this._envelope;
        const args = [];
        if (envelope.dsn && this._supportedExtensions.includes("DSN")) {
          if (envelope.dsn.notify) {
            args.push("NOTIFY=" + shared.encodeXText(envelope.dsn.notify));
          }
          if (envelope.dsn.orcpt) {
            args.push("ORCPT=" + shared.encodeXText(envelope.dsn.orcpt));
          }
        }
        return args.length ? " " + args.join(" ") : "";
      }
      /** @internal */
      _createSendStream(callback) {
        const envelope = this._envelope;
        const dataStream = new data_stream_js_1.default();
        if (this.options.lmtp) {
          envelope.accepted.forEach((recipient, i) => {
            const final = i === envelope.accepted.length - 1;
            this._responseActions.push((str2) => {
              this._actionLMTPStream(recipient, final, str2, callback);
            });
          });
        } else {
          this._responseActions.push((str2) => {
            this._actionSMTPStream(str2, callback);
          });
        }
        this._currentDataStream = dataStream;
        dataStream.pipe(this._socket, {
          end: false
        });
        if (this.options.debug) {
          const logStream = new node_stream_1.PassThrough();
          logStream.on("readable", () => {
            let chunk;
            while (chunk = logStream.read()) {
              this.logger.debug({
                tnx: "message"
              }, chunk.toString("binary").replace(/\r?\n$/, ""));
            }
          });
          dataStream.pipe(logStream);
        }
        dataStream.once("end", () => {
          if (this._currentDataStream === dataStream) {
            this._currentDataStream = false;
          }
          this.logger.info({
            tnx: "message",
            inByteCount: dataStream.inByteCount,
            outByteCount: dataStream.outByteCount
          }, "<%s bytes encoded mime message (source size %s bytes)>", dataStream.outByteCount, dataStream.inByteCount);
        });
        return dataStream;
      }
      /** ACTIONS **/
      /**
       * Will be run after the connection is created and the server sends
       * a greeting. If the incoming message starts with 220 initiate
       * SMTP session by sending EHLO command
       *
       * @param str Message from the server
       * @internal
       */
      _actionGreeting(str2) {
        this._clearPhase();
        if (str2.substr(0, 3) !== "220") {
          this._onError(new Error("Invalid greeting. response=" + str2), "EPROTOCOL", str2, "CONN");
          return;
        }
        if (this.options.lmtp) {
          this._responseActions.push(this._actionLHLO);
          this._sendCommand("LHLO " + this.name);
        } else {
          this._responseActions.push(this._actionEHLO);
          this._sendCommand("EHLO " + this.name);
        }
      }
      /**
       * Handles server response for LHLO command. If it yielded in
       * error, emit 'error', otherwise treat this as an EHLO response
       *
       * @param str Message from the server
       * @internal
       */
      _actionLHLO(str2) {
        if (str2.charAt(0) !== "2") {
          this._onError(new Error("Invalid LHLO. response=" + str2), "EPROTOCOL", str2, "LHLO");
          return;
        }
        this._actionEHLO(str2);
      }
      /**
       * Handles server response for EHLO command. If it yielded in
       * error, try HELO instead, otherwise initiate TLS negotiation
       * if STARTTLS is supported by the server or move into the
       * authentication phase.
       *
       * @param str Message from the server
       * @internal
       */
      _actionEHLO(str2) {
        if (str2.substr(0, 3) === "421") {
          this._onError(new Error("Server terminates connection. response=" + str2), "ECONNECTION", str2, "EHLO");
          return;
        }
        if (str2.charAt(0) !== "2") {
          if (this.options.requireTLS) {
            this._onError(new Error("EHLO failed but HELO does not support required STARTTLS. response=" + str2), "ECONNECTION", str2, "EHLO");
            return;
          }
          this._responseActions.push(this._actionHELO);
          this._sendCommand("HELO " + this.name);
          return;
        }
        if (!this.secure && !this.options.ignoreTLS && (/[ -]STARTTLS\b/im.test(str2) || this.options.requireTLS)) {
          this._plaintextEhlo = str2;
          this._sendCommand("STARTTLS");
          this._responseActions.push(this._actionSTARTTLS);
          return;
        }
        this._parseEhloExtensions(str2);
        this.emit("connect");
      }
      /**
       * Reads the extensions and the authentication mechanisms out of an EHLO response
       *
       * @param str EHLO response from the server
       * @internal
       */
      _parseEhloExtensions(str2) {
        let match;
        this._ehloLines = str2.split(/\r?\n/).map((line) => line.replace(/^\d+[ -]/, "").trim()).filter((line) => line).slice(1);
        if (/[ -]SMTPUTF8\b/im.test(str2)) {
          this._supportedExtensions.push("SMTPUTF8");
        }
        if (/[ -]DSN\b/im.test(str2)) {
          this._supportedExtensions.push("DSN");
        }
        if (/[ -]8BITMIME\b/im.test(str2)) {
          this._supportedExtensions.push("8BITMIME");
        }
        if (/[ -]REQUIRETLS\b/im.test(str2)) {
          this._supportedExtensions.push("REQUIRETLS");
        }
        if (/[ -]PIPELINING\b/im.test(str2)) {
          this._supportedExtensions.push("PIPELINING");
        }
        if (/[ -]AUTH\b/i.test(str2)) {
          this.allowsAuth = true;
        }
        const authMechanisms = /* @__PURE__ */ new Set();
        for (const line of this._ehloLines) {
          const authMatch = /^AUTH[\s=](.*)/i.exec(line);
          if (authMatch) {
            for (const mechanism of authMatch[1].split(/[\s=]+/)) {
              authMechanisms.add(mechanism.toUpperCase());
            }
          }
        }
        for (const mechanism of ["PLAIN", "LOGIN", "CRAM-MD5", "XOAUTH2"]) {
          if (authMechanisms.has(mechanism)) {
            this._supportedAuth.push(mechanism);
          }
        }
        if (match = str2.match(/[ -]SIZE(?:[ \t]+(\d+))?/im)) {
          this._supportedExtensions.push("SIZE");
          this._maxAllowedSize = Number(match[1]) || 0;
        }
      }
      /**
       * Handles server response for HELO command. If it yielded in
       * error, emit 'error', otherwise move into the authentication phase.
       *
       * @param str Message from the server
       * @internal
       */
      _actionHELO(str2) {
        if (str2.charAt(0) !== "2") {
          this._onError(new Error("Invalid HELO. response=" + str2), "EPROTOCOL", str2, "HELO");
          return;
        }
        this.allowsAuth = true;
        this.emit("connect");
      }
      /**
       * Handles server response for STARTTLS command. If there's an error
       * try HELO instead, otherwise initiate TLS upgrade. If the upgrade
       * succeedes restart the EHLO
       *
       * @param str Message from the server
       * @internal
       */
      _actionSTARTTLS(str2) {
        if (str2.charAt(0) !== "2") {
          if (this.options.opportunisticTLS) {
            this.logger.info({
              tnx: "smtp"
            }, "Failed STARTTLS upgrade, continuing unencrypted");
            if (this._plaintextEhlo) {
              this._parseEhloExtensions(this._plaintextEhlo);
              this._plaintextEhlo = false;
              this.allowsAuth = false;
              this._supportedAuth = [];
            }
            this.emit("connect");
            return;
          }
          this._onError(new Error("Error upgrading connection with STARTTLS"), "ETLS", str2, "STARTTLS");
          return;
        }
        this._upgradeConnection((err, secured) => {
          if (err) {
            this._onError(new Error("Error initiating TLS - " + (err.message || err)), "ETLS", false, "STARTTLS");
            return;
          }
          this.logger.info({
            tnx: "smtp"
          }, "Connection upgraded with STARTTLS");
          if (secured) {
            if (this.options.lmtp) {
              this._responseActions.push(this._actionLHLO);
              this._sendCommand("LHLO " + this.name);
            } else {
              this._responseActions.push(this._actionEHLO);
              this._sendCommand("EHLO " + this.name);
            }
          } else {
            this.emit("connect");
          }
        });
      }
      /**
       * Handle the response for AUTH LOGIN command. We are expecting
       * '334 VXNlcm5hbWU6' (base64 for 'Username:'). Data to be sent as
       * response needs to be base64 encoded username. We do not need
       * exact match but settle with 334 response in general as some
       * hosts invalidly use a longer message than VXNlcm5hbWU6
       *
       * @param str Message from the server
       * @param callback Callback to run once the authentication sequence completes
       * @internal
       */
      _actionAUTH_LOGIN_USER(str2, callback) {
        if (!/^334[ -]/.test(str2)) {
          callback(this._formatError('Invalid login sequence while waiting for "334 VXNlcm5hbWU6"', "EAUTH", str2, "AUTH LOGIN"));
          return;
        }
        this._responseActions.push((str3) => {
          this._actionAUTH_LOGIN_PASS(str3, callback);
        });
        this._sendCommand(Buffer.from(this._auth.credentials.user + "", "utf-8").toString("base64"));
      }
      /**
       * Handle the response for AUTH CRAM-MD5 command. We are expecting
       * '334 <challenge string>'. Data to be sent as response needs to be
       * base64 decoded challenge string, MD5 hashed using the password as
       * a HMAC key, prefixed by the username and a space, and finally all
       * base64 encoded again.
       *
       * @param str Message from the server
       * @param callback Callback to run once the authentication sequence completes
       * @internal
       */
      _actionAUTH_CRAM_MD5(str2, callback) {
        const challengeMatch = str2.match(/^334\s+(.+)$/);
        if (!challengeMatch) {
          return callback(this._formatError("Invalid login sequence while waiting for server challenge string", "EAUTH", str2, "AUTH CRAM-MD5"));
        }
        const base64decoded = Buffer.from(challengeMatch[1], "base64").toString("ascii");
        const hmacMD5 = node_crypto_1.default.createHmac("md5", this._auth.credentials.pass);
        hmacMD5.update(base64decoded);
        const prepended = this._auth.credentials.user + " " + hmacMD5.digest("hex");
        this._responseActions.push((str3) => {
          this._actionAUTH_CRAM_MD5_PASS(str3, callback);
        });
        this._sendCommand(
          Buffer.from(prepended).toString("base64"),
          // hidden hash for logs
          Buffer.from(this._auth.credentials.user + " /* secret */").toString("base64")
        );
      }
      /**
       * Handles the response to CRAM-MD5 authentication, if there's no error,
       * the user can be considered logged in. Start waiting for a message to send
       *
       * @param str Message from the server
       * @param callback Callback to run once the authentication sequence completes
       * @internal
       */
      _actionAUTH_CRAM_MD5_PASS(str2, callback) {
        if (!str2.match(/^235\s+/)) {
          return callback(this._formatError('Invalid login sequence while waiting for "235"', "EAUTH", str2, "AUTH CRAM-MD5"));
        }
        this.logger.info({
          tnx: "smtp",
          username: this._auth.user,
          action: "authenticated",
          method: this._authMethod
        }, "User %s authenticated", JSON.stringify(this._auth.user));
        this.authenticated = true;
        callback(null, true);
      }
      /**
       * Handle the response for AUTH LOGIN command. We are expecting
       * '334 UGFzc3dvcmQ6' (base64 for 'Password:'). Data to be sent as
       * response needs to be base64 encoded password.
       *
       * @param str Message from the server
       * @param callback Callback to run once the authentication sequence completes
       * @internal
       */
      _actionAUTH_LOGIN_PASS(str2, callback) {
        if (!/^334[ -]/.test(str2)) {
          return callback(this._formatError('Invalid login sequence while waiting for "334 UGFzc3dvcmQ6"', "EAUTH", str2, "AUTH LOGIN"));
        }
        this._responseActions.push((str3) => {
          this._actionAUTHComplete(str3, callback);
        });
        this._sendCommand(
          Buffer.from((this._auth.credentials.pass || "").toString(), "utf-8").toString("base64"),
          // Hidden pass for logs
          Buffer.from("/* secret */", "utf-8").toString("base64")
        );
      }
      /**
       * Handles the response for authentication, if there's no error,
       * the user can be considered logged in. Start waiting for a message to send
       *
       * @param str Message from the server
       * @param isRetry True if this is a retry after a failed login, or the callback itself
       * @param [callback] Callback to run once the authentication sequence completes
       * @internal
       */
      _actionAUTHComplete(str2, isRetry, callback) {
        if (!callback && typeof isRetry === "function") {
          callback = isRetry;
          isRetry = false;
        }
        if (str2.substr(0, 3) === "334") {
          this._responseActions.push((str3) => {
            if (isRetry || this._authMethod !== "XOAUTH2") {
              this._actionAUTHComplete(str3, true, callback);
            } else {
              setImmediate(() => this._handleXOauth2Token(true, callback));
            }
          });
          this._sendCommand("");
          return;
        }
        if (str2.charAt(0) !== "2") {
          this.logger.info({
            tnx: "smtp",
            username: this._auth.user,
            action: "authfail",
            method: this._authMethod
          }, "User %s failed to authenticate", JSON.stringify(this._auth.user));
          return callback(this._formatError("Invalid login", "EAUTH", str2, "AUTH " + this._authMethod));
        }
        this.logger.info({
          tnx: "smtp",
          username: this._auth.user,
          action: "authenticated",
          method: this._authMethod
        }, "User %s authenticated", JSON.stringify(this._auth.user));
        this.authenticated = true;
        callback(null, true);
      }
      /**
       * Handle response for a MAIL FROM: command
       *
       * @param str Message from the server
       * @param callback Callback to run once the envelope is processed
       * @internal
       */
      _actionMAIL(str2, callback) {
        const envelope = this._envelope;
        if (Number(str2.charAt(0)) !== 2) {
          const message = this._usingSmtpUtf8 && /^550 /.test(str2) && /[\x80-\uFFFF]/.test(envelope.from) ? "Internationalized mailbox name not allowed" : "Mail command failed";
          envelope.mailError = this._formatError(message, "EENVELOPE", str2, "MAIL FROM");
        }
        this._advanceEnvelope(str2, callback);
      }
      /**
       * Handle response for a RCPT TO: command
       *
       * @param str Message from the server
       * @param callback Callback to run once the envelope is processed
       * @internal
       */
      _actionRCPT(str2, callback) {
        const envelope = this._envelope;
        let err;
        const curRecipient = this._recipientQueue.shift();
        if (Number(str2.charAt(0)) !== 2) {
          const message = this._usingSmtpUtf8 && /^553 /.test(str2) && /[\x80-\uFFFF]/.test(curRecipient) ? "Internationalized mailbox name not allowed" : "Recipient command failed";
          envelope.rejected.push(curRecipient);
          err = this._formatError(message, "EENVELOPE", str2, "RCPT TO");
          err.recipient = curRecipient;
          envelope.rejectedErrors.push(err);
        } else {
          envelope.accepted.push(curRecipient);
        }
        this._advanceEnvelope(str2, callback);
      }
      /**
       * Moves the envelope on after a reply to MAIL FROM or RCPT TO. A pipelined envelope sent every
       * command at once and is decided by the reply to DATA. Otherwise the commands go one at a
       * time: the next recipient, or once every reply is in, DATA or the error that ends the message
       *
       * @param str The reply that was handled
       * @param callback Callback to run once the envelope is processed
       * @internal
       */
      _advanceEnvelope(str2, callback) {
        const envelope = this._envelope;
        if (envelope.pipelined) {
          return;
        }
        if (envelope.mailError) {
          return callback(envelope.mailError);
        }
        if (envelope.rcptQueue.length) {
          return this._sendRcpt(envelope.rcptQueue.shift(), callback);
        }
        if (this._recipientQueue.length) {
          return;
        }
        const err = this._envelopeError(str2);
        if (err) {
          return callback(err);
        }
        this._responseActions.push((str3) => {
          this._actionDATA(str3, callback);
        });
        this._sendCommand("DATA");
      }
      /**
       * Decides how the envelope went once every reply to MAIL FROM and RCPT TO is in. Called after
       * the last RCPT TO reply, or with PIPELINING on the reply to the DATA command sent along
       *
       * @param str The reply being handled
       * @returns The error to fail the message with, or null when DATA can go ahead
       * @internal
       */
      _envelopeError(str2) {
        const envelope = this._envelope;
        if (envelope.mailError) {
          return envelope.mailError;
        }
        if (envelope.accepted.length) {
          return null;
        }
        const deferred = envelope.rejectedErrors.find((rejectedErr) => rejectedErr.responseCode && rejectedErr.responseCode < 500);
        const lastRejected = envelope.rejectedErrors[envelope.rejectedErrors.length - 1];
        const reply = deferred?.response ?? (envelope.pipelined && lastRejected ? lastRejected.response : str2);
        const err = this._formatError("Can't send mail - all recipients were rejected", "EENVELOPE", reply, "RCPT TO");
        err.rejected = envelope.rejected;
        err.rejectedErrors = envelope.rejectedErrors;
        return err;
      }
      /**
       * Handle response for a DATA command
       *
       * @param str Message from the server
       * @param callback Callback to run once the envelope is processed
       * @internal
       */
      _actionDATA(str2, callback) {
        const envelope = this._envelope;
        if (envelope.pipelined) {
          const err = this._envelopeError(str2);
          if (err) {
            if (/^3/.test(str2)) {
              if (envelope.mailError) {
                this.close();
                return callback(err);
              }
              this._responseActions.push(() => callback(err));
              this._sendCommand(".");
              return;
            }
            return callback(err);
          }
        }
        if (!/^[23]/.test(str2)) {
          return callback(this._formatError("Data command failed", "EENVELOPE", str2, "DATA"));
        }
        const response = {
          accepted: envelope.accepted,
          rejected: envelope.rejected
        };
        if (this._ehloLines && this._ehloLines.length) {
          response.ehlo = this._ehloLines;
        }
        if (envelope.rejectedErrors.length) {
          response.rejectedErrors = envelope.rejectedErrors;
        }
        callback(null, response);
      }
      /**
       * Handle response for a DATA stream when using SMTP
       * We expect a single response that defines if the sending succeeded or failed
       *
       * @param str Message from the server
       * @param callback Callback to run with the final send result
       * @internal
       */
      _actionSMTPStream(str2, callback) {
        if (Number(str2.charAt(0)) !== 2) {
          return callback(this._formatError("Message failed", "EMESSAGE", str2, "DATA"));
        }
        return callback(null, str2);
      }
      /**
       * Handle response for a DATA stream
       * We expect a separate response for every recipient. All recipients can either
       * succeed or fail separately
       *
       * @param recipient The recipient this response applies to
       * @param final Is this the final recipient?
       * @param str Message from the server
       * @param callback Callback to run with the final send result
       * @internal
       */
      _actionLMTPStream(recipient, final, str2, callback) {
        const envelope = this._envelope;
        let err;
        if (Number(str2.charAt(0)) !== 2) {
          err = this._formatError("Message failed for recipient " + recipient, "EMESSAGE", str2, "DATA");
          err.recipient = recipient;
          envelope.rejected.push(recipient);
          envelope.rejectedErrors.push(err);
          for (let i = 0, len = envelope.accepted.length; i < len; i++) {
            if (envelope.accepted[i] === recipient) {
              envelope.accepted.splice(i, 1);
            }
          }
        }
        if (final) {
          return callback(null, str2);
        }
      }
      /** @internal */
      _handleXOauth2Token(isRetry, callback) {
        this._auth.oauth2.getToken(isRetry, (err, accessToken) => {
          if (err) {
            this.logger.info({
              tnx: "smtp",
              username: this._auth.user,
              action: "authfail",
              method: this._authMethod
            }, "User %s failed to authenticate", JSON.stringify(this._auth.user));
            return callback(this._formatError(err, "EAUTH", false, "AUTH XOAUTH2"));
          }
          this._responseActions.push((str2) => {
            this._actionAUTHComplete(str2, isRetry, callback);
          });
          this._sendCommand(
            "AUTH XOAUTH2 " + this._auth.oauth2.buildXOAuth2Token(accessToken),
            //  Hidden for logs
            "AUTH XOAUTH2 " + this._auth.oauth2.buildXOAuth2Token("/* secret */")
          );
        });
      }
      /**
       *
       * @param command
       * @internal
       */
      _isDestroyedMessage(command) {
        if (this._destroyed) {
          return "Cannot " + command + " - smtp connection is already destroyed.";
        }
        if (this._socket) {
          if (this._socket.destroyed) {
            return "Cannot " + command + " - smtp connection socket is already destroyed.";
          }
          if (!this._socket.writable) {
            return "Cannot " + command + " - smtp connection socket is already half-closed.";
          }
        }
      }
      /** @internal */
      _getHostname() {
        let defaultHostname;
        try {
          defaultHostname = node_os_1.default.hostname() || "";
        } catch (_err) {
          defaultHostname = "localhost";
        }
        if (!defaultHostname || defaultHostname.indexOf(".") < 0) {
          defaultHostname = "[127.0.0.1]";
        }
        if (defaultHostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
          defaultHostname = "[" + defaultHostname + "]";
        }
        return defaultHostname;
      }
    };
    exports2.default = SMTPConnection;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/xoauth2/index.js
var require_xoauth2 = __commonJS({
  "node_modules/nodemailer/dist/cjs/xoauth2/index.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_stream_1 = require("node:stream");
    var index_js_1 = __importDefault(require_fetch());
    var node_crypto_1 = __importDefault(require("node:crypto"));
    var shared = __importStar(require_shared());
    var errors = __importStar(require_errors());
    var XOAuth2 = class extends node_stream_1.Stream {
      constructor(options, logger) {
        super();
        this.options = options || {};
        this.configError = false;
        if (options && options.serviceClient) {
          if (!options.privateKey || !options.user) {
            const err = new Error('Options "privateKey" and "user" are required for service account!');
            err.code = errors.EOAUTH2;
            this.configError = err;
          }
          const serviceRequestTimeout = Math.min(Math.max(Number(this.options.serviceRequestTimeout) || 0, 0), 3600);
          this.options.serviceRequestTimeout = serviceRequestTimeout || 5 * 60;
        }
        this.logger = shared.getLogger({
          logger
        }, {
          component: this.options.component || "OAuth2"
        });
        this.provisionCallback = typeof this.options.provisionCallback === "function" ? this.options.provisionCallback : false;
        this.options.accessUrl = this.options.accessUrl || "https://accounts.google.com/o/oauth2/token";
        this.options.customHeaders = this.options.customHeaders || {};
        this.options.customParams = this.options.customParams || {};
        this.accessToken = this.options.accessToken || false;
        if (this.options.expires && Number(this.options.expires)) {
          this.expires = this.options.expires;
        } else {
          const timeout = Math.max(Number(this.options.timeout) || 0, 0);
          this.expires = timeout && Date.now() + timeout * 1e3 || 0;
        }
        this.renewing = false;
        this.renewalQueue = [];
      }
      /**
       * Returns or generates (if previous has expired) a XOAuth2 token
       *
       * @param renew If false then use cached access token (if available)
       * @param callback Callback function with error object and token string
       */
      getToken(renew, callback) {
        const done = callback;
        if (this.configError) {
          return done(this.configError);
        }
        if (!renew && this.accessToken && (!this.expires || this.expires > Date.now())) {
          this.logger.debug({
            tnx: "OAUTH2",
            user: this.options.user,
            action: "reuse"
          }, "Reusing existing access token for %s", this.options.user);
          return callback(null, this.accessToken);
        }
        if (!this.provisionCallback && !this.options.refreshToken && !this.options.serviceClient) {
          if (this.accessToken) {
            this.logger.debug({
              tnx: "OAUTH2",
              user: this.options.user,
              action: "reuse"
            }, "Reusing existing access token (no refresh capability) for %s", this.options.user);
            return callback(null, this.accessToken);
          }
          this.logger.error({
            tnx: "OAUTH2",
            user: this.options.user,
            action: "renew"
          }, "Cannot renew access token for %s: No refresh mechanism available", this.options.user);
          const err = new Error("Can't create new access token for user");
          err.code = errors.EOAUTH2;
          return done(err);
        }
        if (this.renewing) {
          this.renewalQueue.push({ renew, callback: done });
          return;
        }
        this.renewing = true;
        const generateCallback = (err, accessToken) => {
          this.renewalQueue.forEach((item) => item.callback(err, accessToken));
          this.renewalQueue = [];
          this.renewing = false;
          if (err) {
            this.logger.error({
              err,
              tnx: "OAUTH2",
              user: this.options.user,
              action: "renew"
            }, "Failed generating new Access Token for %s", this.options.user);
          } else {
            this.logger.info({
              tnx: "OAUTH2",
              user: this.options.user,
              action: "renew"
            }, "Generated new Access Token for %s", this.options.user);
          }
          done(err, accessToken);
        };
        if (this.provisionCallback) {
          this.provisionCallback(this.options.user, !!renew, (err, accessToken, expires) => {
            if (!err && accessToken) {
              this.accessToken = accessToken;
              this.expires = expires || 0;
            }
            generateCallback(err, accessToken);
          });
        } else {
          this.generateToken(generateCallback);
        }
      }
      /**
       * Updates token values
       *
       * @param accessToken New access token
       * @param timeout Access token lifetime in seconds
       *
       * Emits 'token': { user: User email-address, accessToken: the new accessToken, timeout: TTL in seconds}
       */
      updateToken(accessToken, timeout) {
        this.accessToken = accessToken;
        timeout = Math.max(Number(timeout) || 0, 0);
        this.expires = timeout && Date.now() + timeout * 1e3 || 0;
        this.emit("token", {
          user: this.options.user,
          accessToken: accessToken || "",
          expires: this.expires
        });
      }
      /**
       * Generates a new XOAuth2 token with the credentials provided at initialization
       *
       * @param callback Callback function with error object and token string
       */
      generateToken(callback) {
        const done = callback;
        let urlOptions;
        let loggedUrlOptions;
        if (this.options.serviceClient) {
          const iat = Math.floor(Date.now() / 1e3);
          const tokenData = {
            iss: this.options.serviceClient,
            scope: this.options.scope || "https://mail.google.com/",
            sub: this.options.user,
            aud: this.options.accessUrl,
            iat,
            exp: iat + this.options.serviceRequestTimeout
          };
          let token;
          try {
            token = this.jwtSignRS256(tokenData);
          } catch (_err) {
            const err = new Error("Can't generate token. Check your auth options");
            err.code = errors.EOAUTH2;
            return done(err);
          }
          urlOptions = {
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: token
          };
          loggedUrlOptions = {
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: tokenData
          };
        } else {
          if (!this.options.refreshToken) {
            const err = new Error("Can't create new access token for user");
            err.code = errors.EOAUTH2;
            return done(err);
          }
          urlOptions = {
            client_id: this.options.clientId || "",
            client_secret: this.options.clientSecret || "",
            refresh_token: this.options.refreshToken,
            grant_type: "refresh_token"
          };
          loggedUrlOptions = {
            client_id: this.options.clientId || "",
            client_secret: (this.options.clientSecret || "").substr(0, 6) + "...",
            refresh_token: (this.options.refreshToken || "").substr(0, 6) + "...",
            grant_type: "refresh_token"
          };
        }
        const customParams = this.options.customParams || {};
        Object.assign(urlOptions, customParams);
        for (const key of Object.keys(customParams)) {
          const param = customParams[key];
          loggedUrlOptions[key] = (param === void 0 || param === null ? "" : String(param)).substr(0, 6) + "...";
        }
        this.logger.debug({
          tnx: "OAUTH2",
          user: this.options.user,
          action: "generate"
        }, "Requesting token using: %s", JSON.stringify(loggedUrlOptions));
        this.postRequest(this.options.accessUrl, urlOptions, this.options, (error, body) => {
          let data;
          if (error) {
            return done(error);
          }
          try {
            data = JSON.parse(body.toString());
          } catch (E) {
            return done(E);
          }
          if (!data || typeof data !== "object") {
            this.logger.debug({
              tnx: "OAUTH2",
              user: this.options.user,
              action: "post"
            }, "Response: %s", (body || "").toString());
            const err2 = new Error("Invalid authentication response");
            err2.code = errors.EOAUTH2;
            return done(err2);
          }
          const logData = Object.assign({}, data);
          if (logData.access_token) {
            logData.access_token = (logData.access_token || "").toString().substr(0, 6) + "...";
          }
          this.logger.debug({
            tnx: "OAUTH2",
            user: this.options.user,
            action: "post"
          }, "Response: %s", JSON.stringify(logData));
          if (data.error) {
            let errorMessage = data.error;
            if (data.error_description) {
              errorMessage += ": " + data.error_description;
            }
            if (data.error_uri) {
              errorMessage += " (" + data.error_uri + ")";
            }
            const err2 = new Error(errorMessage);
            err2.code = errors.EOAUTH2;
            return done(err2);
          }
          if (data.access_token) {
            this.updateToken(data.access_token, data.expires_in);
            return callback(null, this.accessToken);
          }
          const err = new Error("No access token");
          err.code = errors.EOAUTH2;
          return done(err);
        });
      }
      /**
       * Converts an access_token and user id into a base64 encoded XOAuth2 token
       *
       * @param [accessToken] Access token string
       * @return Base64 encoded token for IMAP or SMTP login
       */
      buildXOAuth2Token(accessToken) {
        const authData = ["user=" + (this.options.user || ""), "auth=Bearer " + (accessToken || this.accessToken), "", ""];
        return Buffer.from(authData.join(""), "utf-8").toString("base64");
      }
      /**
       * Custom POST request handler.
       * This is only needed to keep paths short in Windows, usually this module
       * is a dependency of a dependency and if it tries to require something
       * like the request module the paths get way too long to handle for Windows.
       * As we do only a simple POST request we do not actually require complicated
       * logic support (no redirects, no nothing) anyway.
       *
       * @param url Url to POST to
       * @param payload Payload to POST
       * @param params Client options, the customHeaders and tls values are used for the request
       * @param callback Callback function with (err, buff)
       */
      postRequest(url, payload, params, callback) {
        let returned = false;
        const chunks = [];
        let chunklen = 0;
        const fetchOptions = {
          method: "post",
          headers: params.customHeaders,
          body: payload,
          allowErrorResponse: true,
          // unset falls back to the fetch default, a stalled token endpoint would otherwise keep
          // `renewing` set and queue every later request
          timeout: params.requestTimeout
        };
        if (/^https:/i.test(url)) {
          fetchOptions.tls = Object.assign({ rejectUnauthorized: true }, params.tls || {});
        }
        const req = (0, index_js_1.default)(url, fetchOptions);
        req.on("readable", () => {
          let chunk;
          while ((chunk = req.read()) !== null) {
            chunks.push(chunk);
            chunklen += chunk.length;
          }
        });
        req.once("error", (err) => {
          if (returned) {
            return;
          }
          returned = true;
          return callback(err);
        });
        req.once("end", () => {
          if (returned) {
            return;
          }
          returned = true;
          return callback(null, Buffer.concat(chunks, chunklen));
        });
      }
      /**
       * Encodes a buffer or a string into Base64url format
       *
       * @param data The data to convert
       * @return The encoded string
       */
      toBase64URL(data) {
        if (typeof data === "string") {
          data = Buffer.from(data);
        }
        return data.toString("base64").replace(/[=]+/g, "").replace(/\+/g, "-").replace(/\//g, "_");
      }
      /**
       * Creates a JSON Web Token signed with RS256 (SHA256 + RSA)
       *
       * @param payload The payload to include in the generated token
       * @return The generated and signed token
       */
      jwtSignRS256(payload) {
        const signedPayload = ['{"alg":"RS256","typ":"JWT"}', JSON.stringify(payload)].map((val) => this.toBase64URL(val)).join(".");
        const signature = node_crypto_1.default.createSign("RSA-SHA256").update(signedPayload).sign(this.options.privateKey);
        return signedPayload + "." + this.toBase64URL(signature);
      }
    };
    exports2.default = XOAuth2;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/smtp-pool/pool-resource.js
var require_pool_resource = __commonJS({
  "node_modules/nodemailer/dist/cjs/smtp-pool/pool-resource.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var index_js_1 = __importDefault(require_smtp_connection());
    var index_js_2 = require_shared();
    var index_js_3 = __importDefault(require_xoauth2());
    var errors = __importStar(require_errors());
    var node_events_1 = require("node:events");
    var PoolResource = class extends node_events_1.EventEmitter {
      constructor(pool2) {
        super();
        this.pool = pool2;
        this.options = pool2.options;
        this.logger = this.pool.logger;
        if (this.options.auth) {
          switch ((this.options.auth.type || "").toString().toUpperCase()) {
            case "OAUTH2": {
              const oauth2 = new index_js_3.default(this.options.auth, this.logger);
              oauth2.provisionCallback = this.pool.mailer && this.pool.mailer.get("oauth2_provision_cb") || oauth2.provisionCallback;
              this.auth = {
                type: "OAUTH2",
                user: this.options.auth.user,
                oauth2,
                method: "XOAUTH2"
              };
              oauth2.on("token", (token) => this.pool.mailer.emit("token", token));
              oauth2.on("error", (err) => this._fail(err));
              break;
            }
            default:
              if (!this.options.auth.user && !this.options.auth.pass) {
                break;
              }
              this.auth = {
                type: (this.options.auth.type || "").toString().toUpperCase() || "LOGIN",
                user: this.options.auth.user,
                credentials: {
                  user: this.options.auth.user || "",
                  pass: this.options.auth.pass,
                  options: this.options.auth.options
                },
                method: (this.options.auth.method || "").trim().toUpperCase() || this.options.authMethod || false
              };
          }
        }
        this._connection = false;
        this._connected = false;
        this.messages = 0;
        this.available = true;
        this._failed = false;
        this._sending = false;
        this._idleTimer = false;
      }
      /**
       * Emits 'error' for the first failure only. A dead resource can report the same failure more
       * than once (the connection error, then the send callback), the pool handles it once
       * @internal
       */
      _fail(err) {
        if (this._failed) {
          return;
        }
        this._failed = true;
        this.emit("error", err);
      }
      /**
       * Initiates a connection to the SMTP server
       *
       * @param callback Callback function to run once the connection is established or failed
       */
      connect(callback) {
        const connectStartedAt = Date.now();
        this.pool.getSocket(Object.assign({}, this.options, { connectStartedAt }), (err, socketOptions) => {
          if (err) {
            this._fail(err);
            return callback(err);
          }
          let returned = false;
          let options = this.options;
          if (socketOptions && socketOptions.connection) {
            this.logger.info({
              tnx: "proxy",
              remoteAddress: socketOptions.connection.remoteAddress,
              remotePort: socketOptions.connection.remotePort,
              destHost: options.host || "",
              destPort: options.port || "",
              action: "connected"
            }, "Using proxied socket from %s:%s to %s:%s", socketOptions.connection.remoteAddress, socketOptions.connection.remotePort, options.host || "", options.port || "");
            options = Object.assign((0, index_js_2.assign)(false, options), socketOptions);
          }
          this.connection = new index_js_1.default(options);
          this.connection._connectStartedAt = connectStartedAt;
          this.connection.on("error", (err2) => {
            if (this._sending) {
              return;
            }
            if (this._connected && errors.isTransientError(err2)) {
              this.logger.info({
                tnx: "pool",
                cid: this.id
              }, "Connection #%s was closed by the server: %s", this.id, err2.message);
              return;
            }
            this._fail(err2);
            if (returned) {
              return;
            }
            returned = true;
            return callback(err2);
          });
          this.connection.once("end", () => {
            this.close();
            returned = true;
          });
          this.connection.connect((err2) => {
            if (returned) {
              return;
            }
            if (err2) {
              returned = true;
              return;
            }
            if (this.auth && (this.connection.allowsAuth || options.forceAuth)) {
              this.connection.login(this.auth, (err3) => {
                if (returned) {
                  return;
                }
                returned = true;
                if (err3) {
                  this.connection.close();
                  this._fail(err3);
                  return callback(err3);
                }
                this._connected = true;
                callback(null, true);
              });
            } else {
              returned = true;
              this._connected = true;
              return callback(null, true);
            }
          });
        });
      }
      /**
       * Sends an e-mail to be sent using the selected settings
       *
       * @param mail Mail object
       * @param callback Callback function
       */
      send(mail, callback) {
        if (!this._connected) {
          return this.connect((err) => {
            if (err) {
              return callback(err);
            }
            return this.send(mail, callback);
          });
        }
        const envelope = mail.message.getEnvelope();
        const messageId = mail.message.messageId();
        const recipients = [].concat(envelope.to || []);
        if (recipients.length > 3) {
          recipients.push("...and " + recipients.splice(2).length + " more");
        }
        this.logger.info({
          tnx: "send",
          messageId,
          cid: this.id
        }, "Sending message %s using #%s to <%s>", messageId, this.id, recipients.join(", "));
        if (mail.data.dsn) {
          envelope.dsn = mail.data.dsn;
        }
        if (mail.data.requireTLSExtensionEnabled) {
          envelope.requireTLSExtensionEnabled = mail.data.requireTLSExtensionEnabled;
        }
        this._sending = true;
        const reused = this.messages > 0;
        const messageStream = mail.message.createReadStream();
        this.connection.send(envelope, messageStream, (err, info) => {
          this._sending = false;
          this.messages++;
          if (err) {
            if (reused && messageStream.readableDidRead === false && errors.isTransientError(err)) {
              this.logger.info({
                tnx: "pool",
                cid: this.id,
                messageId
              }, "Connection #%s was closed by the server before message %s was sent: %s", this.id, messageId, err.message);
              this.connection.close();
              return;
            }
            if ((err.code === errors.EENVELOPE || err.code === errors.EMESSAGE) && err.responseCode !== 421 && !this.connection._destroyed) {
              this.connection.reset((resetErr) => {
                if (resetErr) {
                  this.connection.close();
                  return;
                }
                this._release();
              });
              return callback(err);
            }
            this.connection.close();
            this._fail(err);
            return callback(err);
          }
          info.envelope = {
            from: envelope.from,
            to: envelope.to
          };
          info.messageId = messageId;
          setImmediate(() => this._release());
          callback(null, info);
        });
      }
      /**
       * Makes the connection available for the next message, or closes it once it has sent
       * maxMessages messages
       *
       * @internal
       */
      _release() {
        if (this.messages >= this.options.maxMessages) {
          const err = new Error("Resource exhausted");
          err.code = errors.EMAXLIMIT;
          this.connection.close();
          this._fail(err);
          return;
        }
        this.pool._checkRateLimit(() => {
          this.available = true;
          this._startIdleTimer();
          this.emit("available");
        });
      }
      /** @internal */
      _startIdleTimer() {
        if (!this.options.idleTimeout || this.options.idleTimeout < 0) {
          return;
        }
        if (this._idleTimer && typeof this._idleTimer.refresh === "function") {
          this._idleTimer.refresh();
          return;
        }
        clearTimeout(this._idleTimer);
        this._idleTimer = setTimeout(() => {
          if (!this.available) {
            return;
          }
          this.logger.debug({
            tnx: "pool",
            cid: this.id
          }, "Closing connection #%s after it was idle for %sms", this.id, this.options.idleTimeout);
          this.available = false;
          this.connection.quit();
        }, this.options.idleTimeout);
        if (typeof this._idleTimer.unref === "function") {
          this._idleTimer.unref();
        }
      }
      /** @internal */
      _stopIdleTimer() {
        clearTimeout(this._idleTimer);
        this._idleTimer = false;
      }
      /**
       * Closes the connection
       */
      close() {
        this._connected = false;
        this._stopIdleTimer();
        if (this.auth && this.auth.oauth2) {
          this.auth.oauth2.removeAllListeners();
        }
        if (this.connection) {
          this.connection.close();
        }
        this.emit("close");
      }
    };
    exports2.default = PoolResource;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/well-known/services.js
var require_services = __commonJS({
  "node_modules/nodemailer/dist/cjs/well-known/services.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.services = void 0;
    exports2.services = {
      "126": {
        "description": "126 Mail (NetEase)",
        "host": "smtp.126.com",
        "port": 465,
        "secure": true
      },
      "163": {
        "description": "163 Mail (NetEase)",
        "host": "smtp.163.com",
        "port": 465,
        "secure": true
      },
      "1und1": {
        "description": "1&1 Mail (German hosting provider)",
        "host": "smtp.1und1.de",
        "port": 465,
        "secure": true,
        "authMethod": "LOGIN"
      },
      "Aliyun": {
        "description": "Alibaba Cloud Mail",
        "domains": [
          "aliyun.com"
        ],
        "host": "smtp.aliyun.com",
        "port": 465,
        "secure": true
      },
      "AliyunQiye": {
        "description": "Alibaba Cloud Enterprise Mail",
        "host": "smtp.qiye.aliyun.com",
        "port": 465,
        "secure": true
      },
      "AOL": {
        "description": "AOL Mail",
        "domains": [
          "aol.com"
        ],
        "host": "smtp.aol.com",
        "port": 587
      },
      "Aruba": {
        "description": "Aruba PEC (Italian email provider)",
        "domains": [
          "aruba.it",
          "pec.aruba.it"
        ],
        "aliases": [
          "Aruba PEC"
        ],
        "host": "smtps.aruba.it",
        "port": 465,
        "secure": true,
        "authMethod": "LOGIN"
      },
      "Bluewin": {
        "description": "Bluewin (Swiss email provider)",
        "host": "smtpauths.bluewin.ch",
        "domains": [
          "bluewin.ch"
        ],
        "port": 465
      },
      "BOL": {
        "description": "BOL Mail (Brazilian provider)",
        "domains": [
          "bol.com.br"
        ],
        "host": "smtp.bol.com.br",
        "port": 587,
        "requireTLS": true
      },
      "DebugMail": {
        "description": "DebugMail (email testing service)",
        "host": "debugmail.io",
        "port": 25
      },
      "Disroot": {
        "description": "Disroot (privacy-focused provider)",
        "domains": [
          "disroot.org"
        ],
        "host": "disroot.org",
        "port": 587,
        "secure": false,
        "authMethod": "LOGIN"
      },
      "DynectEmail": {
        "description": "Dyn Email Delivery",
        "aliases": [
          "Dynect"
        ],
        "host": "smtp.dynect.net",
        "port": 25
      },
      "ElasticEmail": {
        "description": "Elastic Email",
        "aliases": [
          "Elastic Email"
        ],
        "host": "smtp.elasticemail.com",
        "port": 465,
        "secure": true
      },
      "Ethereal": {
        "description": "Ethereal Email (email testing service)",
        "aliases": [
          "ethereal.email"
        ],
        "host": "smtp.ethereal.email",
        "port": 587
      },
      "FastMail": {
        "description": "FastMail",
        "domains": [
          "fastmail.com",
          "fastmail.fm"
        ],
        "host": "smtp.fastmail.com",
        "port": 465,
        "secure": true
      },
      "Feishu Mail": {
        "description": "Feishu Mail (Lark)",
        "aliases": [
          "Feishu",
          "FeishuMail"
        ],
        "domains": [
          "www.feishu.cn"
        ],
        "host": "smtp.feishu.cn",
        "port": 465,
        "secure": true
      },
      "Forward Email": {
        "description": "Forward Email (email forwarding service)",
        "aliases": [
          "FE",
          "ForwardEmail"
        ],
        "domains": [
          "forwardemail.net"
        ],
        "host": "smtp.forwardemail.net",
        "port": 465,
        "secure": true
      },
      "GandiMail": {
        "description": "Gandi Mail",
        "aliases": [
          "Gandi",
          "Gandi Mail"
        ],
        "host": "mail.gandi.net",
        "port": 587
      },
      "Gmail": {
        "description": "Gmail",
        "aliases": [
          "Google Mail"
        ],
        "domains": [
          "gmail.com",
          "googlemail.com"
        ],
        "host": "smtp.gmail.com",
        "port": 465,
        "secure": true
      },
      "GmailWorkspace": {
        "description": "Gmail Workspace",
        "aliases": [
          "Google Workspace Mail"
        ],
        "host": "smtp-relay.gmail.com",
        "port": 465,
        "secure": true
      },
      "GMX": {
        "description": "GMX Mail",
        "domains": [
          "gmx.com",
          "gmx.net",
          "gmx.de"
        ],
        "host": "mail.gmx.com",
        "port": 587
      },
      "Godaddy": {
        "description": "GoDaddy Email (US)",
        "host": "smtpout.secureserver.net",
        "port": 25
      },
      "GodaddyAsia": {
        "description": "GoDaddy Email (Asia)",
        "host": "smtp.asia.secureserver.net",
        "port": 25
      },
      "GodaddyEurope": {
        "description": "GoDaddy Email (Europe)",
        "host": "smtp.europe.secureserver.net",
        "port": 25
      },
      "Groundmail": {
        "description": "Groundmail",
        "host": "smtp.groundmail.dev",
        "port": 587,
        "secure": false,
        "requireTLS": true
      },
      "hot.ee": {
        "description": "Hot.ee (Estonian email provider)",
        "host": "mail.hot.ee"
      },
      "Hotmail": {
        "description": "Outlook.com / Hotmail",
        "aliases": [
          "Outlook",
          "Outlook.com",
          "Hotmail.com"
        ],
        "domains": [
          "hotmail.com",
          "outlook.com"
        ],
        "host": "smtp-mail.outlook.com",
        "port": 587
      },
      "iCloud": {
        "description": "iCloud Mail",
        "aliases": [
          "Me",
          "Mac"
        ],
        "domains": [
          "icloud.com",
          "me.com",
          "mac.com"
        ],
        "host": "smtp.mail.me.com",
        "port": 587
      },
      "Infomaniak": {
        "description": "Infomaniak Mail (Swiss hosting provider)",
        "host": "mail.infomaniak.com",
        "domains": [
          "ik.me",
          "ikmail.com",
          "etik.com"
        ],
        "port": 587
      },
      "KolabNow": {
        "description": "KolabNow (secure email service)",
        "domains": [
          "kolabnow.com"
        ],
        "aliases": [
          "Kolab"
        ],
        "host": "smtp.kolabnow.com",
        "port": 465,
        "secure": true,
        "authMethod": "LOGIN"
      },
      "Loopia": {
        "description": "Loopia (Swedish hosting provider)",
        "host": "mailcluster.loopia.se",
        "port": 465
      },
      "Loops": {
        "description": "Loops",
        "host": "smtp.loops.so",
        "port": 587
      },
      "mail.ee": {
        "description": "Mail.ee (Estonian email provider)",
        "host": "smtp.mail.ee"
      },
      "Mail.ru": {
        "description": "Mail.ru",
        "host": "smtp.mail.ru",
        "port": 465,
        "secure": true
      },
      "Mailcatch.app": {
        "description": "Mailcatch (email testing service)",
        "host": "sandbox-smtp.mailcatch.app",
        "port": 2525
      },
      "Maildev": {
        "description": "MailDev (local email testing)",
        "port": 1025,
        "ignoreTLS": true
      },
      "MailerSend": {
        "description": "MailerSend",
        "host": "smtp.mailersend.net",
        "port": 587
      },
      "Mailgun": {
        "description": "Mailgun",
        "host": "smtp.mailgun.org",
        "port": 465,
        "secure": true
      },
      "Mailjet": {
        "description": "Mailjet",
        "host": "in.mailjet.com",
        "port": 587
      },
      "Mailosaur": {
        "description": "Mailosaur (email testing service)",
        "host": "mailosaur.io",
        "port": 25
      },
      "MailSenpai": {
        "description": "MailSenpai (SMTP Senpai, EU)",
        "host": "relay.mailsenpai.com",
        "port": 2525,
        "secure": false
      },
      "Mailtrap": {
        "description": "Mailtrap",
        "host": "live.smtp.mailtrap.io",
        "port": 587
      },
      "Mandrill": {
        "description": "Mandrill (by Mailchimp)",
        "host": "smtp.mandrillapp.com",
        "port": 587
      },
      "Naver": {
        "description": "Naver Mail (Korean email provider)",
        "host": "smtp.naver.com",
        "port": 587
      },
      "OhMySMTP": {
        "description": "OhMySMTP (email delivery service)",
        "host": "smtp.ohmysmtp.com",
        "port": 587,
        "secure": false
      },
      "One": {
        "description": "One.com Email",
        "host": "send.one.com",
        "port": 465,
        "secure": true
      },
      "OpenMailBox": {
        "description": "OpenMailBox",
        "aliases": [
          "OMB",
          "openmailbox.org"
        ],
        "host": "smtp.openmailbox.org",
        "port": 465,
        "secure": true
      },
      "Outlook365": {
        "description": "Microsoft 365 / Office 365",
        "host": "smtp.office365.com",
        "port": 587,
        "secure": false
      },
      "Oveyon": {
        "description": "Oveyon",
        "host": "smtp.oveyon.com",
        "port": 587,
        "secure": false,
        "requireTLS": true
      },
      "Postmark": {
        "description": "Postmark",
        "aliases": [
          "PostmarkApp"
        ],
        "host": "smtp.postmarkapp.com",
        "port": 2525
      },
      "Proton": {
        "description": "Proton Mail",
        "aliases": [
          "ProtonMail",
          "Proton.me",
          "Protonmail.com",
          "Protonmail.ch"
        ],
        "domains": [
          "proton.me",
          "protonmail.com",
          "pm.me",
          "protonmail.ch"
        ],
        "host": "smtp.protonmail.ch",
        "port": 587,
        "requireTLS": true
      },
      "qiye.aliyun": {
        "description": "Alibaba Mail Enterprise Edition",
        "host": "smtp.mxhichina.com",
        "port": "465",
        "secure": true
      },
      "QQ": {
        "description": "QQ Mail",
        "domains": [
          "qq.com"
        ],
        "host": "smtp.qq.com",
        "port": 465,
        "secure": true
      },
      "QQex": {
        "description": "QQ Enterprise Mail",
        "aliases": [
          "QQ Enterprise"
        ],
        "domains": [
          "exmail.qq.com"
        ],
        "host": "smtp.exmail.qq.com",
        "port": 465,
        "secure": true
      },
      "Resend": {
        "description": "Resend",
        "host": "smtp.resend.com",
        "port": 465,
        "secure": true
      },
      "Runbox": {
        "description": "Runbox (Norwegian email provider)",
        "domains": [
          "runbox.com"
        ],
        "host": "smtp.runbox.com",
        "port": 465,
        "secure": true
      },
      "SendCloud": {
        "description": "SendCloud (Chinese email delivery)",
        "host": "smtp.sendcloud.net",
        "port": 2525
      },
      "SendGrid": {
        "description": "SendGrid",
        "host": "smtp.sendgrid.net",
        "port": 587
      },
      "SendinBlue": {
        "description": "Brevo (formerly Sendinblue)",
        "aliases": [
          "Brevo"
        ],
        "host": "smtp-relay.brevo.com",
        "port": 587
      },
      "SendPulse": {
        "description": "SendPulse",
        "host": "smtp-pulse.com",
        "port": 465,
        "secure": true
      },
      "SES": {
        "description": "AWS SES US East (N. Virginia)",
        "host": "email-smtp.us-east-1.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-AP-NORTHEAST-1": {
        "description": "AWS SES Asia Pacific (Tokyo)",
        "host": "email-smtp.ap-northeast-1.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-AP-NORTHEAST-2": {
        "description": "AWS SES Asia Pacific (Seoul)",
        "host": "email-smtp.ap-northeast-2.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-AP-NORTHEAST-3": {
        "description": "AWS SES Asia Pacific (Osaka)",
        "host": "email-smtp.ap-northeast-3.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-AP-SOUTH-1": {
        "description": "AWS SES Asia Pacific (Mumbai)",
        "host": "email-smtp.ap-south-1.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-AP-SOUTHEAST-1": {
        "description": "AWS SES Asia Pacific (Singapore)",
        "host": "email-smtp.ap-southeast-1.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-AP-SOUTHEAST-2": {
        "description": "AWS SES Asia Pacific (Sydney)",
        "host": "email-smtp.ap-southeast-2.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-CA-CENTRAL-1": {
        "description": "AWS SES Canada (Central)",
        "host": "email-smtp.ca-central-1.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-EU-CENTRAL-1": {
        "description": "AWS SES Europe (Frankfurt)",
        "host": "email-smtp.eu-central-1.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-EU-NORTH-1": {
        "description": "AWS SES Europe (Stockholm)",
        "host": "email-smtp.eu-north-1.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-EU-WEST-1": {
        "description": "AWS SES Europe (Ireland)",
        "host": "email-smtp.eu-west-1.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-EU-WEST-2": {
        "description": "AWS SES Europe (London)",
        "host": "email-smtp.eu-west-2.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-EU-WEST-3": {
        "description": "AWS SES Europe (Paris)",
        "host": "email-smtp.eu-west-3.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-SA-EAST-1": {
        "description": "AWS SES South America (S\xE3o Paulo)",
        "host": "email-smtp.sa-east-1.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-US-EAST-1": {
        "description": "AWS SES US East (N. Virginia)",
        "host": "email-smtp.us-east-1.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-US-EAST-2": {
        "description": "AWS SES US East (Ohio)",
        "host": "email-smtp.us-east-2.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-US-GOV-EAST-1": {
        "description": "AWS SES GovCloud (US-East)",
        "host": "email-smtp.us-gov-east-1.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-US-GOV-WEST-1": {
        "description": "AWS SES GovCloud (US-West)",
        "host": "email-smtp.us-gov-west-1.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-US-WEST-1": {
        "description": "AWS SES US West (N. California)",
        "host": "email-smtp.us-west-1.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "SES-US-WEST-2": {
        "description": "AWS SES US West (Oregon)",
        "host": "email-smtp.us-west-2.amazonaws.com",
        "port": 465,
        "secure": true
      },
      "Seznam": {
        "description": "Seznam Email (Czech email provider)",
        "aliases": [
          "Seznam Email"
        ],
        "domains": [
          "seznam.cz",
          "email.cz",
          "post.cz",
          "spoluzaci.cz"
        ],
        "host": "smtp.seznam.cz",
        "port": 465,
        "secure": true
      },
      "SMTP2GO": {
        "description": "SMTP2GO",
        "host": "mail.smtp2go.com",
        "port": 2525
      },
      "Sparkpost": {
        "description": "SparkPost",
        "aliases": [
          "SparkPost",
          "SparkPost Mail"
        ],
        "domains": [
          "sparkpost.com"
        ],
        "host": "smtp.sparkpostmail.com",
        "port": 587,
        "secure": false
      },
      "Tipimail": {
        "description": "Tipimail (email delivery service)",
        "host": "smtp.tipimail.com",
        "port": 587
      },
      "TurboSMTP": {
        "description": "TurboSMTP",
        "host": "pro.turbo-smtp.com",
        "port": 465,
        "secure": true
      },
      "TurboSMTP-EU": {
        "description": "TurboSMTP (EU region)",
        "host": "pro.eu.turbo-smtp.com",
        "port": 465,
        "secure": true
      },
      "Tutanota": {
        "description": "Tutanota (Tuta Mail)",
        "domains": [
          "tutanota.com",
          "tuta.com",
          "tutanota.de",
          "tuta.io"
        ],
        "host": "smtp.tutanota.com",
        "port": 465,
        "secure": true
      },
      "Yahoo": {
        "description": "Yahoo Mail",
        "domains": [
          "yahoo.com"
        ],
        "host": "smtp.mail.yahoo.com",
        "port": 465,
        "secure": true
      },
      "Yandex": {
        "description": "Yandex Mail",
        "domains": [
          "yandex.ru"
        ],
        "host": "smtp.yandex.ru",
        "port": 465,
        "secure": true
      },
      "Zimbra": {
        "description": "Zimbra Mail Server",
        "aliases": [
          "Zimbra Collaboration"
        ],
        "host": "smtp.zimbra.com",
        "port": 587,
        "requireTLS": true
      },
      "Zoho": {
        "description": "Zoho Mail",
        "host": "smtp.zoho.com",
        "port": 465,
        "secure": true,
        "authMethod": "LOGIN"
      }
    };
  }
});

// node_modules/nodemailer/dist/cjs/well-known/index.js
var require_well_known = __commonJS({
  "node_modules/nodemailer/dist/cjs/well-known/index.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = wellKnown;
    var services_js_1 = require_services();
    var normalized = {};
    Object.keys(services_js_1.services).forEach((key) => {
      const service = services_js_1.services[key];
      const normalizedService = normalizeService(service);
      normalized[normalizeKey(key)] = normalizedService;
      [].concat(service.aliases || []).forEach((alias) => {
        normalized[normalizeKey(alias)] = normalizedService;
      });
      [].concat(service.domains || []).forEach((domain) => {
        normalized[normalizeKey(domain)] = normalizedService;
      });
    });
    function normalizeKey(key) {
      return key.replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase();
    }
    function normalizeService(service) {
      const response = {};
      Object.keys(service).forEach((key) => {
        if (!["domains", "aliases"].includes(key)) {
          response[key] = service[key];
        }
      });
      return response;
    }
    function wellKnown(key) {
      key = normalizeKey(key.split("@").pop());
      return normalized[key] || false;
    }
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/smtp-pool/index.js
var require_smtp_pool = __commonJS({
  "node_modules/nodemailer/dist/cjs/smtp-pool/index.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_events_1 = require("node:events");
    var pool_resource_js_1 = __importDefault(require_pool_resource());
    var index_js_1 = __importDefault(require_smtp_connection());
    var index_js_2 = __importDefault(require_well_known());
    var shared = __importStar(require_shared());
    var errors = __importStar(require_errors());
    var packageData = __importStar(require_package_info());
    var REQUEUE_BASE_DELAY = 50;
    var REQUEUE_MAX_DELAY = 2e3;
    var SMTPPool = class extends node_events_1.EventEmitter {
      constructor(options) {
        super();
        options = options || {};
        if (typeof options === "string") {
          options = {
            url: options
          };
        }
        let urlData;
        let service = options.service;
        if (typeof options.getSocket === "function") {
          this.getSocket = options.getSocket;
        }
        if (options.url) {
          urlData = shared.parseConnectionUrl(options.url);
          service = service || urlData.service;
        }
        this.options = shared.assign(
          false,
          // create new object
          options,
          // regular options
          urlData,
          // url options
          service && (0, index_js_2.default)(service)
          // wellknown options
        );
        this.options.maxConnections = this.options.maxConnections || 5;
        this.options.maxMessages = this.options.maxMessages || 100;
        this.options.maxRequeues = typeof this.options.maxRequeues === "number" ? this.options.maxRequeues : 5;
        this.options.idleTimeout = typeof this.options.idleTimeout === "number" ? this.options.idleTimeout : 4 * 60 * 1e3;
        this.logger = shared.getLogger(this.options, {
          component: this.options.component || "smtp-pool"
        });
        this.name = "SMTP (pool)";
        this.version = packageData.version + "[client:" + packageData.version + "]";
        this._rateLimit = {
          counter: 0,
          timeout: null,
          waiting: [],
          checkpoint: false,
          delta: Number(this.options.rateDelta) || 1e3,
          limit: Number(this.options.rateLimit) || 0
        };
        this._closed = false;
        this._queue = [];
        this._connections = [];
        this._connectionCounter = 0;
        this._pending = 0;
        this.idling = true;
        setImmediate(() => {
          if (this.idling) {
            this.emit("idle");
          }
        });
      }
      /**
       * Placeholder function for creating proxy sockets. This method immediatelly returns
       * without a socket
       *
       * @param options Connection options
       * @param callback Callback function to run with the socket keys
       */
      getSocket(options, callback) {
        setImmediate(() => callback(null, false));
      }
      /**
       * Queues an e-mail to be sent using the selected settings
       *
       * @param mail Mail object
       * @param callback Callback function
       */
      send(mail, callback) {
        if (this._closed) {
          const err = new Error("Connection pool was closed");
          err.code = errors.ECONNECTION;
          setImmediate(() => callback(err));
          return false;
        }
        let counted = true;
        this._pending++;
        this._queue.push({
          mail,
          requeueAttempts: 0,
          callback: (err, info) => {
            if (counted) {
              counted = false;
              this._pending--;
            }
            callback(err, info);
          }
        });
        if (this.idling && this._queue.length >= this.options.maxConnections) {
          this.idling = false;
        }
        setImmediate(() => this._processMessages());
        return true;
      }
      /**
       * Closes all connections in the pool. If there is a message being sent, the connection
       * is closed later
       */
      close() {
        let connection;
        const len = this._connections.length;
        this._closed = true;
        this._clearRateLimit();
        if (!len && !this._queue.length) {
          return;
        }
        for (let i = len - 1; i >= 0; i--) {
          if (this._connections[i] && this._connections[i].available) {
            connection = this._connections[i];
            connection.close();
            this.logger.info({
              tnx: "connection",
              cid: connection.id,
              action: "removed"
            }, "Connection #%s removed", connection.id);
          }
        }
        if (len && !this._connections.length) {
          this.logger.debug({
            tnx: "connection"
          }, "All connections removed");
        }
        if (!this._queue.length) {
          return;
        }
        const invokeCallbacks = () => {
          if (!this._queue.length) {
            this.logger.debug({
              tnx: "connection"
            }, "Pending queue entries cleared");
            return;
          }
          const entry = this._queue.shift();
          if (entry && typeof entry.callback === "function") {
            try {
              entry.callback(new Error("Connection pool was closed"));
            } catch (E) {
              this.logger.error({
                err: E,
                tnx: "callback"
              }, "Callback error: %s", E.message);
            }
          }
          setImmediate(invokeCallbacks);
        };
        setImmediate(invokeCallbacks);
      }
      /**
       * Check the queue and available connections. If there is a message to be sent and there is
       * an available connection, then use this connection to send the mail
       * @internal
       */
      _processMessages() {
        if (this._closed) {
          return;
        }
        if (!this._queue.length) {
          if (!this.idling) {
            this.idling = true;
            this.emit("idle");
          }
          return;
        }
        let connection = this._connections.find((c) => c.available);
        if (!connection && this._connections.length < this.options.maxConnections) {
          connection = this._createConnection();
        }
        if (!connection) {
          this.idling = false;
          return;
        }
        if (!this.idling && this._queue.length < this.options.maxConnections) {
          this.idling = true;
          this.emit("idle");
        }
        const entry = connection.queueEntry = this._queue.shift();
        entry.messageId = (connection.queueEntry.mail.message.getHeader("message-id") || "").replace(/[<>\s]/g, "");
        connection.available = false;
        this.logger.debug({
          tnx: "pool",
          cid: connection.id,
          messageId: entry.messageId,
          action: "assign"
        }, "Assigned message <%s> to #%s (%s)", entry.messageId, connection.id, connection.messages + 1);
        if (this._rateLimit.limit) {
          this._rateLimit.counter++;
          if (!this._rateLimit.checkpoint) {
            this._rateLimit.checkpoint = Date.now();
          }
        }
        connection.send(entry.mail, (err, info) => {
          if (entry === connection.queueEntry) {
            try {
              entry.callback(err, info);
            } catch (E) {
              this.logger.error({
                err: E,
                tnx: "callback",
                cid: connection.id
              }, "Callback error for #%s: %s", connection.id, E.message);
            }
            connection.queueEntry = false;
          }
        });
      }
      /**
       * Creates a new pool resource
       * @internal
       */
      _createConnection() {
        const connection = new pool_resource_js_1.default(this);
        connection.id = ++this._connectionCounter;
        this.logger.info({
          tnx: "pool",
          cid: connection.id,
          action: "conection"
        }, "Created new pool resource #%s", connection.id);
        connection.on("available", () => {
          this.logger.debug({
            tnx: "connection",
            cid: connection.id,
            action: "available"
          }, "Connection #%s became available", connection.id);
          if (this._closed) {
            this.close();
          } else {
            this._processMessages();
          }
        });
        connection.once("error", (err) => {
          if (err.code !== errors.EMAXLIMIT) {
            this.logger.warn({
              err,
              tnx: "pool",
              cid: connection.id
            }, "Pool Error for #%s: %s", connection.id, err.message);
          } else {
            this.logger.debug({
              tnx: "pool",
              cid: connection.id,
              action: "maxlimit"
            }, "Max messages limit exchausted for #%s", connection.id);
          }
          if (connection.queueEntry) {
            try {
              connection.queueEntry.callback(err);
            } catch (E) {
              this.logger.error({
                err: E,
                tnx: "callback",
                cid: connection.id
              }, "Callback error for #%s: %s", connection.id, E.message);
            }
            connection.queueEntry = false;
          }
          this._removeConnection(connection);
          this._continueProcessing();
        });
        connection.once("close", () => {
          this.logger.info({
            tnx: "connection",
            cid: connection.id,
            action: "closed"
          }, "Connection #%s was closed", connection.id);
          this._removeConnection(connection);
          if (connection.queueEntry) {
            setTimeout(() => {
              let delay = 0;
              if (connection.queueEntry) {
                if (this._shouldRequeuOnConnectionClose(connection.queueEntry)) {
                  delay = this._requeueEntryOnConnectionClose(connection);
                } else {
                  this._failDeliveryOnConnectionClose(connection);
                }
              }
              if (delay) {
                setTimeout(() => this._continueProcessing(), delay);
              } else {
                this._continueProcessing();
              }
            }, 50);
          } else {
            if (!this._closed && this.idling && !this._connections.length) {
              this.emit("clear");
            }
            this._continueProcessing();
          }
        });
        this._connections.push(connection);
        return connection;
      }
      /** @internal */
      _shouldRequeuOnConnectionClose(queueEntry) {
        if (this.options.maxRequeues < 0) {
          return true;
        }
        return queueEntry.requeueAttempts < this.options.maxRequeues;
      }
      /** @internal */
      _failDeliveryOnConnectionClose(connection) {
        if (connection.queueEntry && connection.queueEntry.callback) {
          try {
            const err = new Error("Reached maximum number of retries after connection was closed");
            err.code = errors.ECONNECTION;
            connection.queueEntry.callback(err);
          } catch (E) {
            this.logger.error({
              err: E,
              tnx: "callback",
              messageId: connection.queueEntry.messageId,
              cid: connection.id
            }, "Callback error for #%s: %s", connection.id, E.message);
          }
          connection.queueEntry = false;
        }
      }
      /** @internal */
      _requeueEntryOnConnectionClose(connection) {
        const delay = Math.min(REQUEUE_BASE_DELAY * 2 ** connection.queueEntry.requeueAttempts, REQUEUE_MAX_DELAY);
        connection.queueEntry.requeueAttempts += 1;
        this.logger.debug({
          tnx: "pool",
          cid: connection.id,
          messageId: connection.queueEntry.messageId,
          action: "requeue"
        }, "Re-queued message <%s> for #%s. Attempt: #%s", connection.queueEntry.messageId, connection.id, connection.queueEntry.requeueAttempts);
        this._queue.unshift(connection.queueEntry);
        connection.queueEntry = false;
        return delay;
      }
      /**
       * Continue to process message if the pool hasn't closed
       * @internal
       */
      _continueProcessing() {
        if (this._closed) {
          this.close();
        } else {
          setTimeout(() => this._processMessages(), 100);
        }
      }
      /**
       * Remove resource from pool
       *
       * @param connection The PoolResource to remove
       * @internal
       */
      _removeConnection(connection) {
        const index = this._connections.indexOf(connection);
        if (index !== -1) {
          this._connections.splice(index, 1);
        }
      }
      /**
       * Checks if connections have hit current rate limit and if so, queues the availability callback
       *
       * @param callback Callback function to run once rate limiter has been cleared
       * @internal
       */
      _checkRateLimit(callback) {
        if (!this._rateLimit.limit) {
          return callback();
        }
        const now = Date.now();
        if (this._rateLimit.counter < this._rateLimit.limit) {
          return callback();
        }
        this._rateLimit.waiting.push(callback);
        if (this._rateLimit.checkpoint <= now - this._rateLimit.delta) {
          return this._clearRateLimit();
        }
        if (!this._rateLimit.timeout) {
          this._rateLimit.timeout = setTimeout(() => this._clearRateLimit(), this._rateLimit.delta - (now - this._rateLimit.checkpoint));
          this._rateLimit.checkpoint = now;
        }
      }
      /**
       * Clears current rate limit limitation and runs paused callback
       * @internal
       */
      _clearRateLimit() {
        clearTimeout(this._rateLimit.timeout);
        this._rateLimit.timeout = null;
        this._rateLimit.counter = 0;
        this._rateLimit.checkpoint = false;
        while (this._rateLimit.waiting.length) {
          const cb = this._rateLimit.waiting.shift();
          setImmediate(cb);
        }
      }
      /**
       * Returns true if there are free slots in the queue
       */
      isIdle() {
        return this.idling;
      }
      /**
       * Counts the messages the pool has not finished with yet: the ones waiting in the queue
       * plus the ones a connection is transmitting right now. isIdle() only tells whether the
       * pool can take another message, it is already true while a message is still being sent,
       * so use this to check that nothing would be lost by closing the pool. A message that is
       * re-queued after its connection dropped is counted until its callback runs, also while it waits to be put back on the queue, and
       * it is no longer counted by the time its callback runs.
       *
       * @returns Number of queued and in-flight messages
       */
      pendingCount() {
        return this._pending;
      }
      verify(callback) {
        let promise;
        if (!callback) {
          promise = new Promise((resolve, reject) => {
            callback = shared.callbackPromise(resolve, reject);
          });
        }
        const done = callback;
        const auth = new pool_resource_js_1.default(this).auth;
        const connectStartedAt = Date.now();
        this.getSocket(Object.assign({}, this.options, { connectStartedAt }), (err, socketOptions) => {
          if (err) {
            return done(err);
          }
          let options = this.options;
          if (socketOptions && socketOptions.connection) {
            this.logger.info({
              tnx: "proxy",
              remoteAddress: socketOptions.connection.remoteAddress,
              remotePort: socketOptions.connection.remotePort,
              destHost: options.host || "",
              destPort: options.port || "",
              action: "connected"
            }, "Using proxied socket from %s:%s to %s:%s", socketOptions.connection.remoteAddress, socketOptions.connection.remotePort, options.host || "", options.port || "");
            options = Object.assign(shared.assign(false, options), socketOptions);
          }
          const connection = new index_js_1.default(options);
          connection._connectStartedAt = connectStartedAt;
          let returned = false;
          connection.once("error", (err2) => {
            if (returned) {
              return;
            }
            returned = true;
            connection.close();
            return done(err2);
          });
          connection.once("end", () => {
            if (returned) {
              return;
            }
            returned = true;
            return done(new Error("Connection closed"));
          });
          const finalize = () => {
            if (returned) {
              return;
            }
            returned = true;
            connection.quit();
            return done(null, true);
          };
          connection.connect((err2) => {
            if (returned) {
              return;
            }
            if (err2) {
              returned = true;
              connection.close();
              return done(err2);
            }
            if (auth && (connection.allowsAuth || options.forceAuth)) {
              connection.login(auth, (err3) => {
                if (returned) {
                  return;
                }
                if (err3) {
                  returned = true;
                  connection.close();
                  return done(err3);
                }
                finalize();
              });
            } else if (!auth && connection.allowsAuth && options.forceAuth) {
              const err3 = new Error("Authentication info was not provided");
              err3.code = errors.ENOAUTH;
              returned = true;
              connection.close();
              return done(err3);
            } else {
              finalize();
            }
          });
        });
        return promise;
      }
    };
    exports2.default = SMTPPool;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/smtp-transport/index.js
var require_smtp_transport = __commonJS({
  "node_modules/nodemailer/dist/cjs/smtp-transport/index.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_events_1 = require("node:events");
    var index_js_1 = __importDefault(require_smtp_connection());
    var index_js_2 = __importDefault(require_well_known());
    var shared = __importStar(require_shared());
    var index_js_3 = __importDefault(require_xoauth2());
    var errors = __importStar(require_errors());
    var packageData = __importStar(require_package_info());
    var MESSAGE_AUTH_KEYS = ["type", "user", "pass", "accessToken", "refreshToken", "expires"];
    var SMTPTransport = class extends node_events_1.EventEmitter {
      constructor(options) {
        super();
        options = options || {};
        if (typeof options === "string") {
          options = {
            url: options
          };
        }
        let urlData;
        let service = options.service;
        if (typeof options.getSocket === "function") {
          this.getSocket = options.getSocket;
        }
        if (options.url) {
          urlData = shared.parseConnectionUrl(options.url);
          service = service || urlData.service;
        }
        this.options = shared.assign(
          false,
          // create new object
          options,
          // regular options
          urlData,
          // url options
          service && (0, index_js_2.default)(service)
          // wellknown options
        );
        this.logger = shared.getLogger(this.options, {
          component: this.options.component || "smtp-transport"
        });
        this.name = "SMTP";
        this.version = packageData.version + "[client:" + packageData.version + "]";
        if (this.options.auth) {
          this.auth = this.getAuth({});
        }
      }
      /**
       * Placeholder function for creating proxy sockets. This method immediatelly returns
       * without a socket
       *
       * @param options Connection options
       * @param callback Callback function to run with the socket keys
       */
      getSocket(options, callback) {
        setImmediate(() => callback(null, false));
      }
      getAuth(authOpts) {
        if (!authOpts) {
          if (this.auth && this.auth.oauth2 && this.mailer) {
            this.auth.oauth2.provisionCallback = this.mailer.get("oauth2_provision_cb") || this.auth.oauth2.provisionCallback;
          }
          return this.auth;
        }
        const authData = Object.assign({}, this.options.auth && typeof this.options.auth === "object" ? this.options.auth : {});
        if (typeof authOpts === "object") {
          shared.copyOwnKeys(authData, authOpts, (key) => !MESSAGE_AUTH_KEYS.includes(key));
        }
        if (Object.keys(authData).length === 0) {
          return false;
        }
        switch ((authData.type || "").toString().toUpperCase()) {
          case "OAUTH2": {
            if (!authData.service && !authData.user) {
              return false;
            }
            const oauth2 = new index_js_3.default(authData, this.logger);
            oauth2.provisionCallback = this.mailer && this.mailer.get("oauth2_provision_cb") || oauth2.provisionCallback;
            oauth2.on("token", (token) => this.mailer.emit("token", token));
            oauth2.on("error", (err) => this.emit("error", err));
            return {
              type: "OAUTH2",
              user: authData.user,
              oauth2,
              method: "XOAUTH2"
            };
          }
          default:
            return {
              type: (authData.type || "").toString().toUpperCase() || "LOGIN",
              user: authData.user,
              credentials: {
                user: authData.user || "",
                pass: authData.pass,
                options: authData.options
              },
              method: (authData.method || "").trim().toUpperCase() || this.options.authMethod || false
            };
        }
      }
      /**
       * Sends an e-mail using the selected settings
       *
       * @param mail Mail object
       * @param callback Callback function
       */
      send(mail, callback) {
        const connectStartedAt = Date.now();
        this.getSocket(Object.assign({}, this.options, { connectStartedAt }), (err, socketOptions) => {
          if (err) {
            return callback(err);
          }
          let returned = false;
          let options = this.options;
          if (socketOptions && socketOptions.connection) {
            this.logger.info({
              tnx: "proxy",
              remoteAddress: socketOptions.connection.remoteAddress,
              remotePort: socketOptions.connection.remotePort,
              destHost: options.host || "",
              destPort: options.port || "",
              action: "connected"
            }, "Using proxied socket from %s:%s to %s:%s", socketOptions.connection.remoteAddress, socketOptions.connection.remotePort, options.host || "", options.port || "");
            options = Object.assign(shared.assign(false, options), socketOptions);
          }
          const connection = new index_js_1.default(options);
          connection._connectStartedAt = connectStartedAt;
          let perCallAuth;
          const cleanupPerCallAuth = () => {
            if (perCallAuth && perCallAuth !== this.auth && perCallAuth.oauth2) {
              perCallAuth.oauth2.removeAllListeners();
            }
            perCallAuth = null;
          };
          connection.once("error", (err2) => {
            if (returned) {
              return;
            }
            returned = true;
            cleanupPerCallAuth();
            connection.close();
            return callback(err2);
          });
          const sendMessage = () => {
            const envelope = mail.message.getEnvelope();
            const messageId = mail.message.messageId();
            const recipients = [].concat(envelope.to || []);
            if (recipients.length > 3) {
              recipients.push("...and " + recipients.splice(2).length + " more");
            }
            if (mail.data.dsn) {
              envelope.dsn = mail.data.dsn;
            }
            if (mail.data.requireTLSExtensionEnabled) {
              envelope.requireTLSExtensionEnabled = mail.data.requireTLSExtensionEnabled;
            }
            this.logger.info({
              tnx: "send",
              messageId
            }, "Sending message %s to <%s>", messageId, recipients.join(", "));
            connection.send(envelope, mail.message.createReadStream(), (err2, info) => {
              if (returned) {
                return;
              }
              returned = true;
              cleanupPerCallAuth();
              connection.close();
              if (err2) {
                this.logger.error({
                  err: err2,
                  tnx: "send"
                }, "Send error for %s: %s", messageId, err2.message);
                return callback(err2);
              }
              info.envelope = {
                from: envelope.from,
                to: envelope.to
              };
              info.messageId = messageId;
              try {
                return callback(null, info);
              } catch (E) {
                this.logger.error({
                  err: E,
                  tnx: "callback"
                }, "Callback error for %s: %s", messageId, E.message);
              }
            });
          };
          connection.connect((err2) => {
            if (returned) {
              return;
            }
            if (err2) {
              returned = true;
              connection.close();
              return callback(err2);
            }
            perCallAuth = this.getAuth(mail.data.auth);
            if (perCallAuth && (connection.allowsAuth || options.forceAuth)) {
              connection.login(perCallAuth, (err3) => {
                cleanupPerCallAuth();
                if (returned) {
                  return;
                }
                if (err3) {
                  returned = true;
                  connection.close();
                  return callback(err3);
                }
                sendMessage();
              });
            } else {
              sendMessage();
            }
          });
        });
      }
      verify(callback) {
        let promise;
        if (!callback) {
          promise = new Promise((resolve, reject) => {
            callback = shared.callbackPromise(resolve, reject);
          });
        }
        const done = callback;
        const connectStartedAt = Date.now();
        this.getSocket(Object.assign({}, this.options, { connectStartedAt }), (err, socketOptions) => {
          if (err) {
            return done(err);
          }
          let options = this.options;
          if (socketOptions && socketOptions.connection) {
            this.logger.info({
              tnx: "proxy",
              remoteAddress: socketOptions.connection.remoteAddress,
              remotePort: socketOptions.connection.remotePort,
              destHost: options.host || "",
              destPort: options.port || "",
              action: "connected"
            }, "Using proxied socket from %s:%s to %s:%s", socketOptions.connection.remoteAddress, socketOptions.connection.remotePort, options.host || "", options.port || "");
            options = Object.assign(shared.assign(false, options), socketOptions);
          }
          const connection = new index_js_1.default(options);
          connection._connectStartedAt = connectStartedAt;
          let returned = false;
          let perCallAuth;
          const cleanupPerCallAuth = () => {
            if (perCallAuth && perCallAuth !== this.auth && perCallAuth.oauth2) {
              perCallAuth.oauth2.removeAllListeners();
            }
            perCallAuth = null;
          };
          connection.once("error", (err2) => {
            if (returned) {
              return;
            }
            returned = true;
            cleanupPerCallAuth();
            connection.close();
            return done(err2);
          });
          connection.once("end", () => {
            if (returned) {
              return;
            }
            returned = true;
            cleanupPerCallAuth();
            return done(new Error("Connection closed"));
          });
          const finalize = () => {
            if (returned) {
              return;
            }
            returned = true;
            cleanupPerCallAuth();
            connection.quit();
            return done(null, true);
          };
          connection.connect((err2) => {
            if (returned) {
              return;
            }
            if (err2) {
              returned = true;
              connection.close();
              return done(err2);
            }
            perCallAuth = this.getAuth({});
            if (perCallAuth && (connection.allowsAuth || options.forceAuth)) {
              connection.login(perCallAuth, (err3) => {
                cleanupPerCallAuth();
                if (returned) {
                  return;
                }
                if (err3) {
                  returned = true;
                  connection.close();
                  return done(err3);
                }
                finalize();
              });
            } else if (!perCallAuth && connection.allowsAuth && options.forceAuth) {
              const err3 = new Error("Authentication info was not provided");
              err3.code = errors.ENOAUTH;
              returned = true;
              cleanupPerCallAuth();
              connection.close();
              return done(err3);
            } else {
              finalize();
            }
          });
        });
        return promise;
      }
      /**
       * Releases resources
       */
      close() {
        if (this.auth && this.auth.oauth2) {
          this.auth.oauth2.removeAllListeners();
        }
        this.emit("close");
      }
    };
    exports2.default = SMTPTransport;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/sendmail-transport/index.js
var require_sendmail_transport = __commonJS({
  "node_modules/nodemailer/dist/cjs/sendmail-transport/index.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_child_process_1 = require("node:child_process");
    var node_stream_1 = require("node:stream");
    var packageData = __importStar(require_package_info());
    var shared = __importStar(require_shared());
    var errors = __importStar(require_errors());
    var le_windows_js_1 = __importDefault(require_le_windows());
    var le_unix_js_1 = __importDefault(require_le_unix());
    var STDIN_ERROR_EXIT_WAIT = 1e3;
    var SendmailTransport = class {
      constructor(options) {
        options = options || {};
        this._spawn = node_child_process_1.spawn;
        this.options = options;
        this.name = "Sendmail";
        this.version = packageData.version;
        this.path = "sendmail";
        this.args = false;
        this.logger = shared.getLogger(this.options, {
          component: this.options.component || "sendmail"
        });
        if (typeof options === "string") {
          this.path = options;
        } else if (typeof options === "object") {
          if (options.path) {
            this.path = options.path;
          }
          if (Array.isArray(options.args)) {
            this.args = options.args;
          }
        }
        this.winbreak = ["win", "windows", "dos", "\r\n"].includes((options.newline || "").toString().toLowerCase());
      }
      /**
       * <p>Compiles a mailcomposer message and forwards it to handler that sends it.</p>
       *
       * @param mail MailComposer object
       * @param done Callback function to run when the sending is completed
       */
      send(mail, done) {
        mail.message.keepBcc = true;
        const envelope = mail.message.getEnvelope();
        const messageId = mail.message.messageId();
        let returned;
        const hasInvalidAddresses = [].concat(envelope.from || []).concat(envelope.to || []).some((addr) => /^"?-/.test(addr));
        if (hasInvalidAddresses) {
          const err = new Error("Can not send mail. Invalid envelope addresses.");
          err.code = errors.ESENDMAIL;
          return done(err);
        }
        const args = this.args ? ["-i"].concat(this.args).concat(envelope.to) : ["-i"].concat(envelope.from ? ["-f", envelope.from] : []).concat(envelope.to);
        const callback = (err) => {
          if (returned) {
            return;
          }
          returned = true;
          if (typeof done === "function") {
            if (err) {
              return done(err);
            }
            return done(null, {
              envelope,
              messageId,
              response: "Messages queued for delivery"
            });
          }
        };
        let sendmail;
        try {
          sendmail = this._spawn(this.path, args);
        } catch (E) {
          this.logger.error({
            err: E,
            tnx: "spawn",
            messageId
          }, "Error occurred while spawning sendmail. %s", E.message);
          return callback(E);
        }
        if (sendmail) {
          let stream;
          const messageWritten = () => !!stream && stream.readableEnded;
          let stdinError = null;
          const release = () => {
            if (stream && !messageWritten()) {
              stream.destroy();
            }
          };
          const fail = (err) => {
            release();
            callback(err);
          };
          sendmail.on("error", (err) => {
            this.logger.error({
              err,
              tnx: "spawn",
              messageId
            }, "Error occurred when sending message %s. %s", messageId, err.message);
            fail(err);
          });
          const onExit = (code, signal) => {
            let err = null;
            if (code) {
              err = new Error(code === 127 ? "Sendmail command not found, process exited with code " + code : "Sendmail exited with code " + code);
            } else if (signal) {
              err = new Error("Sendmail was terminated by " + signal);
            } else if (!messageWritten()) {
              err = new Error("Sendmail exited before the message was written");
            } else if (stdinError) {
              err = stdinError;
            }
            if (!err) {
              return callback();
            }
            err.code = err.code || errors.ESENDMAIL;
            this.logger.error({
              err,
              tnx: "stdin",
              messageId
            }, "Error sending message %s to sendmail. %s", messageId, err.message);
            fail(err);
          };
          sendmail.once("exit", onExit);
          sendmail.once("close", onExit);
          sendmail.stdin.on("error", (err) => {
            this.logger.error({
              err,
              tnx: "stdin",
              messageId
            }, "Error occurred when piping message %s to sendmail. %s", messageId, err.message);
            if (stdinError) {
              return;
            }
            stdinError = err;
            release();
            const exitTimer = setTimeout(() => fail(err), STDIN_ERROR_EXIT_WAIT);
            sendmail.once("exit", () => clearTimeout(exitTimer));
          });
          const recipients = [].concat(envelope.to || []);
          if (recipients.length > 3) {
            recipients.push("...and " + recipients.splice(2).length + " more");
          }
          this.logger.info({
            tnx: "send",
            messageId
          }, "Sending message %s to <%s>", messageId, recipients.join(", "));
          const sourceStream = mail.message.createReadStream();
          stream = sourceStream;
          if (this.options.newline) {
            stream = (0, node_stream_1.pipeline)(sourceStream, this.winbreak ? new le_windows_js_1.default() : new le_unix_js_1.default(), () => false);
          }
          stream.once("error", (err) => {
            this.logger.error({
              err,
              tnx: "stdin",
              messageId
            }, "Error occurred when generating message %s. %s", messageId, err.message);
            sendmail.kill("SIGINT");
            callback(err);
          });
          stream.pipe(sendmail.stdin);
        } else {
          const err = new Error("sendmail was not found");
          err.code = errors.ESENDMAIL;
          return callback(err);
        }
      }
    };
    exports2.default = SendmailTransport;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/stream-transport/index.js
var require_stream_transport = __commonJS({
  "node_modules/nodemailer/dist/cjs/stream-transport/index.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var packageData = __importStar(require_package_info());
    var shared = __importStar(require_shared());
    var le_windows_js_1 = __importDefault(require_le_windows());
    var le_unix_js_1 = __importDefault(require_le_unix());
    var StreamTransport = class {
      constructor(options) {
        options = options || {};
        this.options = options;
        this.name = "StreamTransport";
        this.version = packageData.version;
        this.logger = shared.getLogger(this.options, {
          component: this.options.component || "stream-transport"
        });
        this.winbreak = ["win", "windows", "dos", "\r\n"].includes((options.newline || "").toString().toLowerCase());
      }
      /**
       * Compiles a mailcomposer message and forwards it to handler that sends it
       *
       * @param mail MailComposer object
       * @param done Callback function to run when the sending is completed
       */
      send(mail, done) {
        mail.message.keepBcc = true;
        const envelope = mail.message.getEnvelope();
        const messageId = mail.message.messageId();
        const recipients = [].concat(envelope.to || []);
        if (recipients.length > 3) {
          recipients.push("...and " + recipients.splice(2).length + " more");
        }
        this.logger.info({
          tnx: "send",
          messageId
        }, "Sending message %s to <%s> using %s line breaks", messageId, recipients.join(", "), this.winbreak ? "<CR><LF>" : "<LF>");
        setImmediate(() => {
          let stream;
          try {
            stream = mail.message.createReadStream();
            if (this.options.newline) {
              const sourceStream = stream;
              stream = sourceStream.pipe(this.winbreak ? new le_windows_js_1.default() : new le_unix_js_1.default());
              sourceStream.once("error", (err) => stream.emit("error", err));
            }
          } catch (E) {
            this.logger.error({
              err: E,
              tnx: "send",
              messageId
            }, "Creating send stream failed for %s. %s", messageId, E.message);
            return done(E);
          }
          if (!this.options.buffer) {
            stream.once("error", (err) => {
              this.logger.error({
                err,
                tnx: "send",
                messageId
              }, "Failed creating message for %s. %s", messageId, err.message);
            });
            return done(null, {
              envelope,
              messageId,
              message: stream
            });
          }
          const chunks = [];
          let chunklen = 0;
          stream.on("readable", () => {
            let chunk;
            while ((chunk = stream.read()) !== null) {
              chunks.push(chunk);
              chunklen += chunk.length;
            }
          });
          stream.once("error", (err) => {
            this.logger.error({
              err,
              tnx: "send",
              messageId
            }, "Failed creating message for %s. %s", messageId, err.message);
            return done(err);
          });
          stream.on("end", () => done(null, {
            envelope,
            messageId,
            message: Buffer.concat(chunks, chunklen)
          }));
        });
      }
    };
    exports2.default = StreamTransport;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/json-transport/index.js
var require_json_transport = __commonJS({
  "node_modules/nodemailer/dist/cjs/json-transport/index.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    Object.defineProperty(exports2, "__esModule", { value: true });
    var packageData = __importStar(require_package_info());
    var shared = __importStar(require_shared());
    var JSONTransport = class {
      constructor(options) {
        options = options || {};
        this.options = options;
        this.name = "JSONTransport";
        this.version = packageData.version;
        this.logger = shared.getLogger(this.options, {
          component: this.options.component || "json-transport"
        });
      }
      /**
       * <p>Compiles a mailcomposer message and forwards it to handler that sends it.</p>
       *
       * @param mail MailComposer object
       * @param done Callback function to run when the sending is completed
       */
      send(mail, done) {
        mail.message.keepBcc = true;
        const envelope = mail.message.getEnvelope();
        const messageId = mail.message.messageId();
        const recipients = [].concat(envelope.to || []);
        if (recipients.length > 3) {
          recipients.push("...and " + recipients.splice(2).length + " more");
        }
        this.logger.info({
          tnx: "send",
          messageId
        }, "Composing JSON structure of %s to <%s>", messageId, recipients.join(", "));
        setImmediate(() => {
          mail.normalize((err, data) => {
            if (err) {
              this.logger.error({
                err,
                tnx: "send",
                messageId
              }, "Failed building JSON structure for %s. %s", messageId, err.message);
              return done(err);
            }
            delete data.envelope;
            delete data.normalizedHeaders;
            return done(null, {
              envelope,
              messageId,
              message: this.options.skipEncoding ? data : JSON.stringify(data)
            });
          });
        });
      }
    };
    exports2.default = JSONTransport;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/ses-transport/index.js
var require_ses_transport = __commonJS({
  "node_modules/nodemailer/dist/cjs/ses-transport/index.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var node_events_1 = __importDefault(require("node:events"));
    var packageData = __importStar(require_package_info());
    var shared = __importStar(require_shared());
    var errors = __importStar(require_errors());
    var le_windows_js_1 = __importDefault(require_le_windows());
    var index_js_1 = __importDefault(require_mime_node());
    function tagSesError(err) {
      if (err && typeof err === "object" && !err.code) {
        err.code = errors.ESES;
      }
      return err;
    }
    var SESTransport = class extends node_events_1.default {
      constructor(options) {
        super();
        if (!options || !options.SES || !options.SES.sesClient) {
          const error = new Error("Missing SES configuration, expecting { sesClient, SendEmailCommand } from @aws-sdk/client-sesv2, see https://nodemailer.com/transports/ses/");
          error.code = errors.ECONFIG;
          throw error;
        }
        this.options = options;
        this.ses = this.options.SES;
        this.name = "SESTransport";
        this.version = packageData.version;
        this.logger = shared.getLogger(this.options, {
          component: this.options.component || "ses-transport"
        });
      }
      getRegion(cb) {
        if (this.ses.sesClient.config && typeof this.ses.sesClient.config.region === "function") {
          this.ses.sesClient.config.region().then((region) => cb(null, region), (err) => cb(err));
          return;
        }
        return cb(null, false);
      }
      /**
       * Compiles a mailcomposer message and forwards it to SES
       *
       * @param mail MailComposer object
       * @param callback Callback function to run when the sending is completed
       */
      send(mail, callback) {
        let fromHeader = mail.message._headers.find((header) => /^from$/i.test(header.key));
        if (fromHeader) {
          const mimeNode = new index_js_1.default("text/plain");
          fromHeader = mimeNode._convertAddresses(mimeNode._parseAddresses(fromHeader.value));
        }
        const envelope = mail.message.getEnvelope();
        const messageId = mail.message.messageId();
        const recipients = [].concat(envelope.to || []);
        if (recipients.length > 3) {
          recipients.push("...and " + recipients.splice(2).length + " more");
        }
        this.logger.info({
          tnx: "send",
          messageId
        }, "Sending message %s to <%s>", messageId, recipients.join(", "));
        const getRawMessage = (next) => {
          if (!mail.data._dkim) {
            mail.data._dkim = {};
          }
          if (mail.data._dkim.skipFields && typeof mail.data._dkim.skipFields === "string") {
            mail.data._dkim.skipFields += ":date:message-id";
          } else {
            mail.data._dkim.skipFields = "date:message-id";
          }
          const sourceStream = mail.message.createReadStream();
          const stream = sourceStream.pipe(new le_windows_js_1.default());
          const chunks = [];
          let chunklen = 0;
          stream.on("readable", () => {
            let chunk;
            while ((chunk = stream.read()) !== null) {
              chunks.push(chunk);
              chunklen += chunk.length;
            }
          });
          sourceStream.once("error", (err) => stream.emit("error", err));
          stream.once("error", (err) => next(err));
          stream.once("end", () => next(null, Buffer.concat(chunks, chunklen)));
        };
        setImmediate(() => getRawMessage((err, raw) => {
          if (err) {
            this.logger.error({
              err,
              tnx: "send",
              messageId
            }, "Failed creating message for %s. %s", messageId, err.message);
            return callback(err);
          }
          const sesMessage = shared.copyOwnKeys({
            Content: {
              Raw: {
                // required
                Data: raw
                // required
              }
            },
            FromEmailAddress: fromHeader || envelope.from,
            Destination: {
              ToAddresses: envelope.to
            }
          }, mail.data.ses);
          this.getRegion((err2, region) => {
            if (err2 || !region) {
              region = "us-east-1";
            }
            let sendPromise;
            try {
              const command = new this.ses.SendEmailCommand(sesMessage);
              sendPromise = this.ses.sesClient.send(command);
            } catch (err3) {
              tagSesError(err3);
              this.logger.error({
                err: err3,
                tnx: "send"
              }, "Send error for %s: %s", messageId, err3.message);
              setImmediate(() => callback(err3));
              return;
            }
            sendPromise.then((data) => {
              if (region === "us-east-1") {
                region = "email";
              }
              const info = {
                envelope: {
                  from: envelope.from,
                  to: envelope.to
                },
                messageId: "<" + data.MessageId + (!/@/.test(data.MessageId) ? "@" + region + ".amazonses.com" : "") + ">",
                response: data.MessageId,
                raw
              };
              setImmediate(() => callback(null, info));
            }).catch((err3) => {
              tagSesError(err3);
              this.logger.error({
                err: err3,
                tnx: "send"
              }, "Send error for %s: %s", messageId, err3.message);
              setImmediate(() => callback(err3));
            });
          });
        }));
      }
      verify(callback) {
        let promise;
        if (!callback) {
          promise = new Promise((resolve, reject) => {
            callback = shared.callbackPromise(resolve, reject);
          });
        }
        const done = callback;
        const cb = (err) => {
          if (err && !["InvalidParameterValue", "MessageRejected"].includes(err.code || err.Code || err.name)) {
            return done(tagSesError(err));
          }
          return done(null, true);
        };
        const sesMessage = {
          Content: {
            Raw: {
              Data: Buffer.from("From: <invalid@invalid>\r\nTo: <invalid@invalid>\r\n Subject: Invalid\r\n\r\nInvalid")
            }
          },
          FromEmailAddress: "invalid@invalid",
          Destination: {
            ToAddresses: ["invalid@invalid"]
          }
        };
        this.getRegion(() => {
          let sendPromise;
          try {
            const command = new this.ses.SendEmailCommand(sesMessage);
            sendPromise = this.ses.sesClient.send(command);
          } catch (err) {
            setImmediate(() => cb(err));
            return;
          }
          sendPromise.then(() => setImmediate(() => cb(null))).catch((err) => setImmediate(() => cb(err)));
        });
        return promise;
      }
    };
    exports2.default = SESTransport;
    module2.exports = exports2.default;
    Object.defineProperty(module2.exports, "default", { value: exports2.default, enumerable: false, writable: true, configurable: true });
  }
});

// node_modules/nodemailer/dist/cjs/nodemailer.js
var require_nodemailer = __commonJS({
  "node_modules/nodemailer/dist/cjs/nodemailer.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createTransport = createTransport;
    exports2.createTestAccount = createTestAccount;
    exports2.getTestMessageUrl = getTestMessageUrl;
    var index_js_1 = __importDefault(require_mailer());
    var shared = __importStar(require_shared());
    var index_js_2 = __importDefault(require_smtp_pool());
    var index_js_3 = __importDefault(require_smtp_transport());
    var index_js_4 = __importDefault(require_sendmail_transport());
    var index_js_5 = __importDefault(require_stream_transport());
    var index_js_6 = __importDefault(require_json_transport());
    var index_js_7 = __importDefault(require_ses_transport());
    var errors = __importStar(require_errors());
    var index_js_8 = __importDefault(require_fetch());
    var packageData = __importStar(require_package_info());
    var etherealApi = () => (process.env.ETHEREAL_API || "https://api.nodemailer.com").replace(/\/+$/, "");
    var etherealWeb = () => (process.env.ETHEREAL_WEB || "https://ethereal.email").replace(/\/+$/, "");
    var etherealApiKey = () => (process.env.ETHEREAL_API_KEY || "").replace(/\s*/g, "") || null;
    var etherealCache = () => ["true", "yes", "y", "1"].includes((process.env.ETHEREAL_CACHE || "yes").toString().trim().toLowerCase());
    var testAccount = false;
    function createTransport(transporter, defaults) {
      let options;
      if (
        // provided transporter is a configuration object, not transporter plugin
        typeof transporter === "object" && typeof transporter.send !== "function" || // provided transporter looks like a connection url
        typeof transporter === "string" && /^(smtps?|direct):/i.test(transporter)
      ) {
        const urlConfig = typeof transporter === "string" ? transporter : transporter.url;
        if (urlConfig) {
          const parsed = shared.parseConnectionUrl(urlConfig);
          options = typeof transporter === "object" ? shared.assign(false, shared.copyOwnKeys({}, transporter, (key) => key === "url"), parsed) : parsed;
        } else {
          options = transporter;
        }
        if (options.pool) {
          transporter = new index_js_2.default(options);
        } else if (options.sendmail) {
          transporter = new index_js_4.default(options);
        } else if (options.streamTransport) {
          transporter = new index_js_5.default(options);
        } else if (options.jsonTransport) {
          transporter = new index_js_6.default(options);
        } else if (options.SES) {
          const ses = options.SES;
          if (ses.ses && ses.aws) {
            const error = new Error("Using legacy SES configuration, expecting @aws-sdk/client-sesv2, see https://nodemailer.com/transports/ses/");
            error.code = errors.ECONFIG;
            throw error;
          }
          transporter = new index_js_7.default(options);
        } else {
          transporter = new index_js_3.default(options);
        }
      }
      return new index_js_1.default(transporter, options, defaults);
    }
    function createTestAccount(apiUrl, callback) {
      let promise;
      if (!callback && typeof apiUrl === "function") {
        callback = apiUrl;
        apiUrl = false;
      }
      if (!callback) {
        promise = new Promise((resolve, reject) => {
          callback = shared.callbackPromise(resolve, reject);
        });
      }
      const done = callback;
      if (etherealCache() && testAccount) {
        setImmediate(() => done(null, testAccount));
        return promise;
      }
      apiUrl = apiUrl || etherealApi();
      const chunks = [];
      let chunklen = 0;
      const requestHeaders = {};
      const requestBody = {
        requestor: packageData.name,
        version: packageData.version
      };
      const apiKey = etherealApiKey();
      if (apiKey) {
        requestHeaders.Authorization = "Bearer " + apiKey;
      }
      const fetchOptions = {
        contentType: "application/json",
        method: "POST",
        headers: requestHeaders,
        body: Buffer.from(JSON.stringify(requestBody))
      };
      if (/^https:/i.test(apiUrl)) {
        fetchOptions.tls = { rejectUnauthorized: true };
      }
      const req = (0, index_js_8.default)(apiUrl + "/user", fetchOptions);
      req.on("readable", () => {
        let chunk;
        while ((chunk = req.read()) !== null) {
          chunks.push(chunk);
          chunklen += chunk.length;
        }
      });
      req.once("error", (err) => done(err));
      req.once("end", () => {
        const res = Buffer.concat(chunks, chunklen);
        let data;
        try {
          data = JSON.parse(res.toString());
        } catch (E) {
          return done(E);
        }
        if (data.status !== "success" || data.error) {
          return done(new Error(data.error || "Request failed"));
        }
        delete data.status;
        testAccount = data;
        done(null, testAccount);
      });
      return promise;
    }
    function getTestMessageUrl(info) {
      if (!info || !info.response) {
        return false;
      }
      const infoProps = /* @__PURE__ */ new Map();
      const response = info.response.toString();
      if (response.length > 2 && response.charAt(response.length - 1) === "]") {
        const open = response.indexOf("[", response.lastIndexOf("]", response.length - 2) + 1);
        if (open >= 0 && open < response.length - 2) {
          const props = response.substring(open + 1, response.length - 1);
          props.replace(/\b([A-Z0-9]+)=([^\s]+)/g, (m, key, value) => {
            infoProps.set(key, value);
            return m;
          });
        }
      }
      if (infoProps.has("STATUS") && infoProps.has("MSGID")) {
        return (testAccount && testAccount.web || etherealWeb()) + "/message/" + infoProps.get("MSGID");
      }
      return false;
    }
    var nodemailer = {
      createTransport,
      createTestAccount,
      getTestMessageUrl
    };
    exports2.default = nodemailer;
    Object.defineProperty(exports2, "default", { value: exports2, enumerable: false, writable: true, configurable: true });
  }
});

// src/mail.js
var require_mail = __commonJS({
  "src/mail.js"(exports2, module2) {
    "use strict";
    var esc = (s) => String(s === null || s === void 0 ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    var EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;
    var PRIORITY = { low: "Th\u1EA5p", medium: "Trung b\xECnh", high: "Cao", urgent: "Kh\u1EA9n c\u1EA5p" };
    var fmtDate = (s) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ""));
      return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
    };
    module2.exports = function makeMail2({ pool: pool2, env = process.env, log = console }) {
      const user = String(env.SMTP_USER || "").trim(), pass = String(env.SMTP_PASS || "").replace(/\s+/g, "");
      const appUrl = String(env.APP_URL || "https://nemviethancoworking-coder.github.io/nemviethancloudCLAUDE/okr/").trim();
      const fromName = String(env.MAIL_FROM_NAME || "OKR Weekly").trim();
      const enabled = !!(user && pass);
      let transporter = null, chain = Promise.resolve(), warned = false;
      function getTransporter() {
        if (transporter) return transporter;
        const nodemailer = require_nodemailer();
        const port = Number(env.SMTP_PORT || 465);
        transporter = nodemailer.createTransport({
          host: env.SMTP_HOST || "smtp.gmail.com",
          port,
          secure: port === 465,
          auth: { user, pass },
          pool: true,
          maxConnections: 2,
          connectionTimeout: 15e3,
          socketTimeout: 3e4
        });
        return transporter;
      }
      function layout(heading, lines, extraHtml) {
        const rows = lines.filter((l) => l && l[1]).map((l) => `<tr><td style="padding:3px 14px 3px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${esc(l[0])}</td><td style="padding:3px 0;color:#111827">${esc(l[1])}</td></tr>`).join("");
        return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111827;max-width:560px">
<div style="font-size:16px;font-weight:bold;margin-bottom:12px">${esc(heading)}</div>
<table style="border-collapse:collapse;font-size:14px">${rows}</table>
${extraHtml || ""}
<p style="margin:18px 0 6px"><a href="${esc(appUrl)}" style="background:#2f6fed;color:#fff;text-decoration:none;padding:9px 16px;border-radius:6px;display:inline-block">M\u1EDF OKR Weekly</a></p>
<p style="color:#9ca3af;font-size:12px;margin-top:14px">Email t\u1EF1 \u0111\u1ED9ng t\u1EEB h\u1EC7 th\u1ED1ng OKR Weekly. Vui l\xF2ng kh\xF4ng tr\u1EA3 l\u1EDDi email n\xE0y.</p></div>`;
      }
      const quote = (text) => text ? `<div style="margin-top:12px;padding:10px 12px;background:#f3f4f6;border-left:3px solid #2f6fed;border-radius:4px;white-space:pre-wrap">${esc(text)}</div>` : "";
      function build(note, actor) {
        const who = actor ? actor.name : "M\u1ED9t \u0111\u1ED3ng nghi\u1EC7p";
        const t = note.task || {};
        const taskLines = [["C\xF4ng vi\u1EC7c", t.title], ["D\u1EF1 \xE1n", t.project], ["Ng\u01B0\u1EDDi giao", who], ["Ng\xE0y b\u1EAFt \u0111\u1EA7u", fmtDate(t.startDate)], ["H\u1EA1n ch\xF3t", fmtDate(t.due)], ["\u01AFu ti\xEAn", PRIORITY[t.priority] || ""]];
        if (note.kind === "assigned") return { subject: "[OKR Weekly] B\u1EA1n \u0111\u01B0\u1EE3c giao vi\u1EC7c: " + t.title, html: layout(who + " v\u1EEBa giao vi\u1EC7c cho b\u1EA1n", taskLines) };
        if (note.kind === "reassigned") return { subject: "[OKR Weekly] B\u1EA1n \u0111\u01B0\u1EE3c giao l\u1EA1i vi\u1EC7c: " + t.title, html: layout(who + " v\u1EEBa giao l\u1EA1i m\u1ED9t c\xF4ng vi\u1EC7c cho b\u1EA1n", taskLines) };
        if (note.kind === "taskComment") return { subject: "[OKR Weekly] B\xECnh lu\u1EADn m\u1EDBi: " + t.title, html: layout(who + " v\u1EEBa b\xECnh lu\u1EADn trong m\u1ED9t c\xF4ng vi\u1EC7c", [["C\xF4ng vi\u1EC7c", t.title]], quote(note.text)) };
        if (note.kind === "reportFeedback") {
          const r = note.report || {};
          return {
            subject: "[OKR Weekly] " + who + " \u0111\xE3 ph\u1EA3n h\u1ED3i b\xE1o c\xE1o tu\u1EA7n " + r.week + "/" + r.year,
            html: layout(who + " v\u1EEBa ph\u1EA3n h\u1ED3i b\xE1o c\xE1o tu\u1EA7n c\u1EE7a b\u1EA1n", [["B\xE1o c\xE1o", "Tu\u1EA7n " + r.week + "/" + r.year], ["M\u1EE5c ti\xEAu (OKR)", r.okrTitle]], quote(note.text))
          };
        }
        return null;
      }
      async function deliver(notes) {
        const ids = [...new Set(notes.flatMap((n) => (n.to || []).concat(n.actorId ? [n.actorId] : [])))];
        if (!ids.length) return;
        const rows = (await pool2.query("SELECT id, name, email, active FROM users WHERE id = ANY($1)", [ids])).rows;
        const by = new Map(rows.map((r) => [r.id, r]));
        for (const note of notes) {
          const msg = build(note, by.get(note.actorId));
          if (!msg) continue;
          for (const id of note.to || []) {
            const r = by.get(id);
            if (!r || r.active === false || !EMAIL_RE.test(String(r.email || ""))) continue;
            try {
              await getTransporter().sendMail({ from: '"' + fromName.replace(/"/g, "") + '" <' + user + ">", to: r.email, subject: msg.subject, html: msg.html });
            } catch (e) {
              log.error("G\u1EEDi email t\u1EDBi " + r.email + " th\u1EA5t b\u1EA1i: " + (e && e.message || e));
            }
          }
        }
      }
      function queue(notes) {
        if (!notes || !notes.length) return;
        if (!enabled) {
          if (!warned) {
            warned = true;
            log.warn("Email th\xF4ng b\xE1o \u0111ang T\u1EAET (ch\u01B0a \u0111\u1EB7t SMTP_USER / SMTP_PASS).");
          }
          return;
        }
        chain = chain.then(() => deliver(notes)).catch((e) => log.error("L\u1ED7i g\u1EEDi email: " + (e && e.message || e)));
      }
      return { enabled, queue, build, EMAIL_RE, whenIdle: () => chain };
    };
    module2.exports.EMAIL_RE = EMAIL_RE;
  }
});

// src/notify.js
var require_notify = __commonJS({
  "src/notify.js"(exports2, module2) {
    "use strict";
    var crypto2 = require("crypto");
    var KINDS = {
      assigned: "task",
      reassigned: "task",
      taskComment: "task",
      follower: "task",
      reportFeedback: "report",
      okrApproved: "okr",
      okrRejected: "okr",
      okrPending: "okr"
    };
    var KEEP = 200;
    var LIST_LIMIT = 60;
    var clip = (s, n) => String(s === null || s === void 0 ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
    var newId = () => "n" + crypto2.randomBytes(8).toString("hex");
    function subjectOf(note) {
      if (KINDS[note.kind] === "task") return clip(note.task && note.task.title, 200);
      if (note.kind === "reportFeedback") {
        const r = note.report || {};
        return clip("B\xE1o c\xE1o tu\u1EA7n " + r.week + "/" + r.year + (r.okrTitle ? " \xB7 " + r.okrTitle : ""), 200);
      }
      return clip(note.okr && note.okr.title, 200);
    }
    var refIdOf = (note) => KINDS[note.kind] === "task" ? note.task && note.task.id : note.kind === "reportFeedback" ? note.report && note.report.id : note.okr && note.okr.id;
    async function save(q, notes, byId) {
      const recipients = /* @__PURE__ */ new Set(), wsCache = /* @__PURE__ */ new Map();
      const wsOf = async (taskId) => {
        if (!wsCache.has(taskId)) {
          const r = await q.query("SELECT p.workspace_id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1", [taskId]);
          wsCache.set(taskId, r.rows[0] ? r.rows[0].workspace_id || "" : "");
        }
        return wsCache.get(taskId);
      };
      for (const note of notes || []) {
        const refType = KINDS[note.kind];
        if (!refType) continue;
        const refId = refIdOf(note);
        if (!refId) continue;
        const refWs = refType === "task" ? await wsOf(refId) : "";
        const detail = clip(note.text || note.okr && note.okr.note, 600);
        const subject = subjectOf(note), when = (/* @__PURE__ */ new Date()).toISOString();
        for (const to of [...new Set(note.to || [])]) {
          const u = byId[to];
          if (!u || u.active === false || to === note.actorId) continue;
          await q.query(
            "INSERT INTO notifications(id,user_id,kind,actor_id,ref_type,ref_id,ref_ws,subject,detail,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
            [newId(), to, note.kind, note.actorId || "", refType, String(refId), refWs, subject, detail, when]
          );
          recipients.add(to);
        }
      }
      for (const uid of recipients) {
        await q.query("DELETE FROM notifications WHERE user_id = $1 AND seq < (SELECT seq FROM notifications WHERE user_id = $1 ORDER BY seq DESC OFFSET $2 LIMIT 1)", [uid, KEEP - 1]);
      }
      return [...recipients];
    }
    async function list(q, userId) {
      const [rows, cnt] = await Promise.all([
        q.query("SELECT id, kind, actor_id, ref_type, ref_id, ref_ws, subject, detail, created_at, is_read FROM notifications WHERE user_id = $1 ORDER BY seq DESC LIMIT $2", [userId, LIST_LIMIT]),
        q.query("SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND NOT is_read", [userId])
      ]);
      return {
        unread: cnt.rows[0].n,
        items: rows.rows.map((r) => ({ id: r.id, kind: r.kind, actorId: r.actor_id, refType: r.ref_type, refId: r.ref_id, refWs: r.ref_ws, subject: r.subject, detail: r.detail, createdAt: r.created_at, read: r.is_read }))
      };
    }
    async function mark(q, userId, p) {
      const read = p.read !== false;
      if (p.all) await q.query("UPDATE notifications SET is_read = $2 WHERE user_id = $1 AND is_read <> $2", [userId, read]);
      else {
        const ids = (Array.isArray(p.ids) ? p.ids : []).map(String).slice(0, 200);
        if (ids.length) await q.query("UPDATE notifications SET is_read = $3 WHERE user_id = $1 AND id = ANY($2)", [userId, ids, read]);
      }
    }
    async function remove(q, userId, p) {
      if (p.clearRead) await q.query("DELETE FROM notifications WHERE user_id = $1 AND is_read", [userId]);
      else if (p.id) await q.query("DELETE FROM notifications WHERE user_id = $1 AND id = $2", [userId, String(p.id)]);
    }
    var SCHEMA2 = `
CREATE TABLE IF NOT EXISTS notifications (id text PRIMARY KEY, user_id text NOT NULL, kind text NOT NULL, actor_id text NOT NULL DEFAULT '', ref_type text NOT NULL DEFAULT '',
  ref_id text NOT NULL DEFAULT '', ref_ws text NOT NULL DEFAULT '', subject text NOT NULL DEFAULT '', detail text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false, seq bigserial);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, seq DESC);
`;
    module2.exports = { KINDS, SCHEMA: SCHEMA2, save, list, mark, remove };
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
    var PENDING = "pending";
    var PRIORITIES = ["low", "medium", "high", "urgent"];
    var DEFAULT_WS = "w_default";
    var DEFAULT_DEPT = "d_default";
    var DEFAULT_PROJECT = "p_general";
    var UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";
    var MAX_FILE = Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024;
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
    var RT = "<!--rt-->";
    var ErrCls = Error;
    var RT_CLASSES = /* @__PURE__ */ new Set(["c-red", "c-orange", "c-blue"]);
    var RT_BLOCK_END = /* @__PURE__ */ new Set(["div", "p", "li", "ul", "ol", "tr", "blockquote", "pre", "h1", "h2", "h3", "h4", "h5", "h6"]);
    var RT_MAX_DEPTH = 32;
    var ENTITY = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", "#x27": "'", nbsp: " " };
    var decodeEntities = (s) => s.replace(/&(amp|lt|gt|quot|apos|nbsp|#39|#x27);/gi, (_, k) => ENTITY[k.toLowerCase()]);
    var escapeText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var RT_TOKEN = /<!--[\s\S]*?(?:-->|$)|<[!?][^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|[^<]+|</g;
    var isRich = (s) => typeof s === "string" && s.startsWith(RT);
    var RT_MAX_IMAGES = 20;
    function richImg(attrs) {
      const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
      let m;
      while (m = re.exec(attrs)) {
        if (m[1].toLowerCase() !== "data-f") continue;
        const v = m[2] !== void 0 ? m[2] : m[3] !== void 0 ? m[3] : m[4] || "";
        return /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : "";
      }
      return "";
    }
    function richClass(attrs) {
      const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
      let m;
      while (m = re.exec(attrs)) {
        if (m[1].toLowerCase() !== "class") continue;
        const v = (m[2] !== void 0 ? m[2] : m[3] !== void 0 ? m[3] : m[4] || "").split(/\s+/).filter(Boolean);
        return v.length === 1 && RT_CLASSES.has(v[0]) ? v[0] : "";
      }
      return "";
    }
    function plainOf(s) {
      s = s === null || s === void 0 ? "" : String(s);
      if (!isRich(s)) return s;
      return decodeEntities(s.slice(RT.length).replace(/<br\s*\/?>/gi, "\n").replace(/<img\b[^>]*>/gi, "[\u1EA3nh]").replace(/<[^>]*>/g, ""));
    }
    function cleanRich(s, maxLen) {
      s = s === null || s === void 0 ? "" : String(s);
      if (!isRich(s)) return maxLen ? s.slice(0, maxLen) : s;
      const body = s.slice(RT.length).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u2028\u2029]/g, "");
      const out = [], stack = [];
      let imgCount = 0;
      const openHtml = (e) => e.keep ? "<" + e.n + (e.cls ? ' class="' + e.cls + '"' : "") + ">" : "";
      const closeHtml = (e) => e.keep ? "</" + e.n + ">" : "";
      const closeEntry = (n) => {
        const i = stack.map((e) => e.n).lastIndexOf(n);
        if (i < 0) return;
        const above = stack.splice(i);
        for (let k = above.length - 1; k >= 0; k--) out.push(closeHtml(above[k]));
        for (const e of above.slice(1)) {
          stack.push(e);
          out.push(openHtml(e));
        }
      };
      for (const m of body.matchAll(RT_TOKEN)) {
        const [tok, slash, rawName, attrs] = m;
        if (rawName === void 0) {
          if (tok.startsWith("<!") || tok.startsWith("<?")) continue;
          out.push(escapeText(decodeEntities(tok)));
          continue;
        }
        const name = rawName.toLowerCase(), n = name === "strong" ? "b" : name === "em" ? "i" : name;
        if (n === "br") {
          out.push("<br>");
          continue;
        }
        if (n === "img") {
          const f = !slash ? richImg(attrs) : "";
          if (f) {
            if (++imgCount > RT_MAX_IMAGES) throw new ErrCls("M\u1ED7i n\u1ED9i dung d\xE1n t\u1ED1i \u0111a " + RT_MAX_IMAGES + " \u1EA3nh.");
            out.push('<img data-f="' + f + '">');
          }
          continue;
        }
        if (slash) {
          if (n === "b" || n === "i" || n === "span") closeEntry(n);
          else if (RT_BLOCK_END.has(name)) out.push("<br>");
          continue;
        }
        if (stack.length >= RT_MAX_DEPTH || n !== "b" && n !== "i" && n !== "span") continue;
        const cls = n === "span" ? richClass(attrs) : "";
        const e = { n, keep: n !== "span" || !!cls, cls };
        stack.push(e);
        out.push(openHtml(e));
      }
      for (let k = stack.length - 1; k >= 0; k--) out.push(closeHtml(stack[k]));
      const html = out.join("").replace(/^(?:<br>|\s)+/, "").replace(/(?:<br>|\s)+$/, "");
      if (!plainOf(RT + html).trim()) return "";
      const res = RT + html;
      if (maxLen && res.length > maxLen) throw new ErrCls("N\u1ED9i dung qu\xE1 d\xE0i.");
      return res;
    }
    var cleanText = (s, maxLen) => {
      const r = cleanRich(s, maxLen);
      return isRich(r) ? r : r.trim();
    };
    module2.exports = function makeWork(D) {
      const { pool: pool2, AppError: AppError2, deny: deny2, str: str2, num: num2, one: one2, canManage: canManage2, todayISO: todayISO2, ctxFor: ctxFor2 } = D;
      ErrCls = AppError2;
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
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date text NOT NULL DEFAULT '';
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
ALTER TABLE recurring_tasks ADD COLUMN IF NOT EXISTS followers jsonb NOT NULL DEFAULT '[]';
ALTER TABLE recurring_tasks ADD COLUMN IF NOT EXISTS est_hours double precision;
ALTER TABLE recurring_tasks ADD COLUMN IF NOT EXISTS next_due text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS est_hours double precision;
CREATE TABLE IF NOT EXISTS inline_images (id text PRIMARY KEY, name text NOT NULL DEFAULT '', mime text NOT NULL DEFAULT '', size bigint NOT NULL DEFAULT 0,
  uploaded_by text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS task_followers (task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id text NOT NULL, PRIMARY KEY (task_id, user_id));
CREATE INDEX IF NOT EXISTS task_followers_user ON task_followers(user_id);
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
        if (me.role === "head") return "pm";
        if (p.manager_id === me.id || deptHeadId && deptHeadId === me.id) return "pm";
        if (p.open || members.has(me.id)) return "member";
        for (const uid of members) if (canManage2(c, uid)) return "member";
        return null;
      }
      const isTopRole = (c) => c.me.role === "director" || c.me.role === "head";
      function visibleToViewer(c, t, assignees, followers) {
        const me = c.me;
        if (isTopRole(c)) return true;
        if (t.created_by === me.id || assignees.includes(me.id) || (followers || []).includes(me.id)) return true;
        if (me.role !== "manager") return false;
        return assignees.some((a) => canManage2(c, a)) || !!t.created_by && canManage2(c, t.created_by);
      }
      function canEditTask(c, t, assignees) {
        if (isTopRole(c)) return true;
        if (t.created_by === c.me.id || assignees.includes(c.me.id)) return true;
        return c.me.role === "manager" && (assignees.some((a) => canManage2(c, a)) || !!t.created_by && canManage2(c, t.created_by));
      }
      const canEditContent = (c, t) => !t.series_id && !!t.created_by && t.created_by === c.me.id;
      function canDeleteTask(c, t, assignees) {
        if (c.me.role === "director") return true;
        if (t.created_by) return t.created_by === c.me.id || canManage2(c, t.created_by);
        return assignees.some((a) => canManage2(c, a));
      }
      const canFollowTask = (c, t, assignees) => c.me.role === "director" || t.created_by === c.me.id || assignees.includes(c.me.id);
      function canAssign(c, access, uid) {
        const u = c.byId[uid];
        return !!u && !!u.active;
      }
      const canManageRecurring = (c, r) => c.me.role === "director" || !!r.created_by && (r.created_by === c.me.id || canManage2(c, r.created_by));
      const recurringVisible = (c, r) => canManageRecurring(c, r) || idList(r.assignees).some((a) => a === c.me.id || canManage2(c, a)) || idList(r.followers).includes(c.me.id);
      const assignError = (c, a) => {
        const u = c.byId[a];
        return !u ? "Ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n kh\xF4ng t\u1ED3n t\u1EA1i." : u.name + " \u0111\xE3 b\u1ECB kho\xE1 t\xE0i kho\u1EA3n.";
      };
      const followError = (c, a) => {
        const u = c.byId[a];
        return !u ? "Ng\u01B0\u1EDDi theo d\xF5i kh\xF4ng t\u1ED3n t\u1EA1i." : u.name + " \u0111\xE3 b\u1ECB kho\xE1 t\xE0i kho\u1EA3n.";
      };
      const MAX_FOLLOWERS = 50;
      function cleanFollowers(c, v, assignees, prev) {
        const ids = idList(v).filter((id) => !assignees.includes(id));
        if (ids.length > MAX_FOLLOWERS) throw new AppError2("T\u1ED1i \u0111a " + MAX_FOLLOWERS + " ng\u01B0\u1EDDi theo d\xF5i m\u1ED7i c\xF4ng vi\u1EC7c.");
        for (const id of ids) if (!(prev || []).includes(id) && !(c.byId[id] && c.byId[id].active)) throw new AppError2(followError(c, id));
        return ids;
      }
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
        const assignees = await taskAssignees(c.q, t), followers = await taskFollowers(c.q, t.id);
        return {
          t,
          assignees,
          followers,
          p: pc ? pc.p : null,
          members: pc ? pc.members : /* @__PURE__ */ new Set(),
          access: pc ? pc.access : c.me.role === "director" ? "admin" : null,
          canView: visibleToViewer(c, t, assignees, followers)
        };
      }
      async function taskAssignees(q, t) {
        const ids = (await q.query("SELECT user_id FROM task_assignees WHERE task_id=$1", [t.id])).rows.map((r) => r.user_id);
        if (t.assignee_id && !ids.includes(t.assignee_id)) ids.push(t.assignee_id);
        return [...ids.filter((x) => x === t.assignee_id), ...ids.filter((x) => x !== t.assignee_id).sort()];
      }
      async function taskFollowers(q, taskId) {
        return (await q.query("SELECT user_id FROM task_followers WHERE task_id=$1 ORDER BY user_id", [taskId])).rows.map((r) => r.user_id);
      }
      async function loadPeople(q, rows) {
        const asg = /* @__PURE__ */ new Map(), fol = /* @__PURE__ */ new Map(), ids = rows.map((r) => r.id);
        if (ids.length) {
          const [ar, fr] = await Promise.all([q.query("SELECT task_id, user_id FROM task_assignees WHERE task_id = ANY($1)", [ids]), q.query("SELECT task_id, user_id FROM task_followers WHERE task_id = ANY($1)", [ids])]);
          ar.rows.forEach((r) => {
            if (!asg.has(r.task_id)) asg.set(r.task_id, []);
            asg.get(r.task_id).push(r.user_id);
          });
          fr.rows.forEach((r) => {
            if (!fol.has(r.task_id)) fol.set(r.task_id, []);
            fol.get(r.task_id).push(r.user_id);
          });
        }
        return { asg, fol };
      }
      function filterVisibleTasks(c, rows, asg, fol) {
        const out = [];
        for (const t of rows) {
          const ids = (asg.get(t.id) || []).slice();
          if (t.assignee_id && !ids.includes(t.assignee_id)) ids.push(t.assignee_id);
          const assignees = [...ids.filter((x) => x === t.assignee_id), ...ids.filter((x) => x !== t.assignee_id).sort()];
          const followers = (fol.get(t.id) || []).slice().sort();
          if (visibleToViewer(c, t, assignees, followers)) out.push({ t, assignees, followers });
        }
        return out;
      }
      async function ensureMember(q, projectId, wsId, userId) {
        await q.query("INSERT INTO project_members(project_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [projectId, userId]);
        await q.query("INSERT INTO workspace_members(workspace_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [wsId, userId]);
      }
      const jsonTask = (t, assignees, followers, cc, ac) => ({
        id: t.id,
        projectId: t.project_id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assigneeIds: assignees,
        followerIds: followers || [],
        startDate: t.start_date || "",
        due: t.due,
        estHours: t.est_hours == null ? null : Number(t.est_hours),
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
        const isDir = c.me.role === "director", seesAllWs = isTopRole(c);
        const access = /* @__PURE__ */ new Map();
        prr.rows.forEach((p) => {
          const a = projectAccess(c, p, prMem.get(p.id) || /* @__PURE__ */ new Set(), p.department_id && deptById.get(p.department_id) ? deptById.get(p.department_id).head_id : "");
          if (a) access.set(p.id, a);
        });
        const myWs = wsr.rows.filter((w) => seesAllWs || w.open || w.created_by === c.me.id || (wsMem.get(w.id) || /* @__PURE__ */ new Set()).has(c.me.id) || prr.rows.some((p) => p.workspace_id === w.id && access.has(p.id)) || dpr.rows.some((d) => d.workspace_id === w.id && d.head_id === c.me.id));
        const current = myWs.find((w) => w.id === wsId) || myWs.find((w) => w.id === DEFAULT_WS) || myWs[0] || null;
        const projects = current ? prr.rows.filter((p) => p.workspace_id === current.id && access.has(p.id)) : [];
        const pids = projects.map((p) => p.id), pById = new Map(projects.map((p) => [p.id, p]));
        let tasks = [];
        if (pids.length) {
          const tr = await pool2.query(`SELECT t.*, (SELECT count(*) FROM task_comments k WHERE k.task_id = t.id)::int AS cc, (SELECT count(*) FROM task_attachments a WHERE a.task_id = t.id)::int AS ac
                  FROM tasks t WHERE t.project_id = ANY($1) ORDER BY t.position, t.seq`, [pids]);
          const { asg, fol } = await loadPeople(pool2, tr.rows);
          tasks = filterVisibleTasks(c, tr.rows, asg, fol).map((v) => jsonTask(v.t, v.assignees, v.followers, v.t.cc, v.t.ac));
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
            followerIds: idList(r.followers),
            rule: r.rule,
            createdBy: r.created_by,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            estHours: r.est_hours == null ? null : Number(r.est_hours),
            openCount: s ? s.open : 0,
            nextDue: s && s.next ? s.next : "",
            pendingDue: r.next_due || "",
            canEdit: canManageRecurring(c, r)
          };
        });
      }
      async function loadTaskDetail(c, taskId) {
        const tc = await taskCtx(c, taskId);
        if (!tc || !tc.canView) throw new AppError2("Kh\xF4ng t\xECm th\u1EA5y c\xF4ng vi\u1EC7c ho\u1EB7c b\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n xem.");
        const [cm, at] = await Promise.all([
          pool2.query("SELECT * FROM task_comments WHERE task_id=$1 ORDER BY seq", [taskId]),
          pool2.query("SELECT * FROM task_attachments WHERE task_id=$1 ORDER BY seq", [taskId])
        ]);
        return {
          comments: cm.rows.map((r) => ({ id: r.id, authorId: r.author_id, text: r.text, createdAt: r.created_at, mentions: r.mentions || [] })),
          attachments: at.rows.map((a) => ({ id: a.id, name: a.name, mime: a.mime, size: Number(a.size), uploadedBy: a.uploaded_by, createdAt: a.created_at })),
          followerIds: tc.followers,
          canEdit: canEditTask(c, tc.t, tc.assignees),
          canDelete: canDeleteTask(c, tc.t, tc.assignees),
          canEditContent: canEditContent(c, tc.t),
          canFollow: canFollowTask(c, tc.t, tc.assignees)
        };
      }
      const cleanTags = (v) => uniq((Array.isArray(v) ? v : []).map((x) => str2(x).trim().slice(0, 30)).filter(Boolean)).slice(0, 12);
      const cleanSubtasks = (v) => (Array.isArray(v) ? v : []).slice(0, 100).map((s) => ({ id: safeId(s && s.id) ? String(s.id) : newId("s"), text: str2(s && s.text).trim().slice(0, 300), done: !!(s && s.done) })).filter((s) => s.text);
      const cleanHours = (v) => {
        const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
        return v !== null && v !== "" && v !== void 0 && isFinite(n) && n > 0 ? Math.min(1e3, Math.round(n * 100) / 100) : null;
      };
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
        const today = todayISO2();
        const due = nextDue(rule, t.due, today);
        if (!due) return {};
        if (due > today) {
          await c.q.query("UPDATE recurring_tasks SET next_due=$2 WHERE id=$1", [tpl.id, due]);
          await c.q.query("UPDATE tasks SET spawned_id=$2 WHERE id=$1", [t.id, PENDING]);
          return { scheduled: { due, title: tpl.title } };
        }
        const id = await spawnInstance(c, tpl, rule, due);
        if (!id) return {};
        await c.q.query("UPDATE tasks SET spawned_id=$2 WHERE id=$1", [t.id, id]);
        return { spawned: { id, due, title: tpl.title } };
      }
      async function spawnDueRecurring(c) {
        const today = todayISO2();
        const rows = (await c.q.query(`SELECT * FROM recurring_tasks WHERE next_due <> '' AND next_due <= $1 ORDER BY seq`, [today])).rows;
        let made = 0;
        for (const tpl of rows) {
          const rule = cleanRule(tpl.rule);
          let due = rule ? tpl.next_due : "";
          if (rule && due < today) due = nextDue(rule, due, today) || "";
          if (!due || rule && rule.end && due > rule.end) {
            await c.q.query(`UPDATE recurring_tasks SET next_due='' WHERE id=$1`, [tpl.id]);
            continue;
          }
          if (due > today) {
            await c.q.query("UPDATE recurring_tasks SET next_due=$2 WHERE id=$1", [tpl.id, due]);
            continue;
          }
          const id = await spawnInstance(c, tpl, rule, due);
          await c.q.query(`UPDATE recurring_tasks SET next_due='' WHERE id=$1`, [tpl.id]);
          if (id) {
            await c.q.query(`UPDATE tasks SET spawned_id=$2 WHERE series_id=$1 AND spawned_id=$3`, [tpl.id, id, PENDING]);
            made++;
          }
        }
        return made;
      }
      async function spawnInstance(c, tpl, rule, due) {
        const proj = await one2(c.q, "SELECT workspace_id, open, archived FROM projects WHERE id=$1", [tpl.project_id]);
        if (!proj || proj.archived) return null;
        let ids = idList(tpl.assignees).filter((id2) => c.byId[id2] && c.byId[id2].active);
        if (!ids.length) ids = [c.byId[tpl.created_by] && c.byId[tpl.created_by].active ? tpl.created_by : c.me.id];
        const id = newId("t");
        const today = todayISO2();
        await c.q.query(
          `INSERT INTO tasks(id,title,assignee_id,okr_id,week,year,due,status,created_at,project_id,description,priority,tags,subtasks,recurrence,created_by,position,series_id,start_date,est_hours)
      VALUES($1,$2,$3,NULL,0,0,$4,'todo',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
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
            tpl.id,
            due && due < today ? due : today,
            tpl.est_hours == null ? null : tpl.est_hours
          ]
        );
        for (const a of ids) {
          await c.q.query("INSERT INTO task_assignees(task_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [id, a]);
          if (!proj.open) await ensureMember(c.q, tpl.project_id, proj.workspace_id, a);
        }
        for (const f of idList(tpl.followers).filter((x) => c.byId[x] && c.byId[x].active && !ids.includes(x))) {
          await c.q.query("INSERT INTO task_followers(task_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [id, f]);
          if (!proj.open) await ensureMember(c.q, tpl.project_id, proj.workspace_id, f);
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
        await c.q.query("DELETE FROM task_followers WHERE task_id=$1 AND user_id = ANY($2)", [taskId, ids]);
      }
      async function writeFollowers(c, taskId, ids, pc) {
        await c.q.query("DELETE FROM task_followers WHERE task_id=$1 AND NOT (user_id = ANY($2))", [taskId, ids]);
        for (const f of ids) {
          await c.q.query("INSERT INTO task_followers(task_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [taskId, f]);
          if (!pc.members.has(f) && !pc.p.open) await ensureMember(c.q, pc.p.id, pc.p.workspace_id, f);
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
          const row = [j.id, ws.id, dept, str2(j.name).trim().slice(0, 100), str2(j.description).slice(0, 1e3), str2(j.color) || "#2f6fed", managerId, open, !!j.archived];
          if (old) await c.q.query("UPDATE projects SET workspace_id=$2, department_id=$3, name=$4, description=$5, color=$6, manager_id=$7, open=$8, archived=$9 WHERE id=$1", row);
          else await c.q.query(
            "INSERT INTO projects(id,workspace_id,department_id,name,description,color,manager_id,open,archived,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
            [...row, c.me.id, (/* @__PURE__ */ new Date()).toISOString()]
          );
          if (Array.isArray(j.memberIds) || !old) {
            const keep = (await c.q.query(`SELECT a.user_id FROM task_assignees a JOIN tasks t ON t.id = a.task_id WHERE t.project_id=$1 AND t.status <> 'done'
          UNION SELECT f.user_id FROM task_followers f JOIN tasks t ON t.id = f.task_id WHERE t.project_id=$1 AND t.status <> 'done'`, [j.id])).rows.map((r) => r.user_id);
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
         * Tạo công việc mới, hoặc (chỉ NGƯỜI TẠO) sửa nội dung việc mình đã tạo: tên, mô tả, ưu tiên, hạn, nhãn, việc con, người thực hiện, người theo dõi.
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
          if (!old && !pc.access) deny2("B\u1EA1n ch\u01B0a tham gia d\u1EF1 \xE1n n\xE0y.");
          if (!old && pc.p.archived) throw new AppError2("D\u1EF1 \xE1n \u0111\xE3 l\u01B0u tr\u1EEF, kh\xF4ng th\xEAm vi\u1EC7c m\u1EDBi \u0111\u01B0\u1EE3c.");
          const priority = PRIORITIES.includes(t.priority) ? t.priority : old ? old.t.priority : "medium";
          let assignees = idList(t.assigneeIds);
          if (!assignees.length) assignees = old ? old.assignees : [c.me.id];
          const prev = old ? old.assignees : [];
          for (const a of assignees) if (!prev.includes(a) && !canAssign(c, pc.access, a)) throw new AppError2(assignError(c, a));
          const due = normDue(t.due);
          const startRaw = str2(t.startDate).trim().slice(0, 10);
          let startDate;
          if (old) {
            if (t.startDate === void 0) startDate = old.t.start_date || "";
            else if (!startRaw) {
              if (old.t.start_date) throw new AppError2("Ch\u1ECDn ng\xE0y b\u1EAFt \u0111\u1EA7u c\u1EE7a c\xF4ng vi\u1EC7c.");
              startDate = "";
            } else startDate = startRaw;
          } else {
            if (!startRaw) throw new AppError2("Ch\u1ECDn ng\xE0y b\u1EAFt \u0111\u1EA7u c\u1EE7a c\xF4ng vi\u1EC7c.");
            startDate = startRaw;
          }
          if (startDate && !validISO(startDate)) throw new AppError2("Ng\xE0y b\u1EAFt \u0111\u1EA7u kh\xF4ng h\u1EE3p l\u1EC7.");
          if (startDate && due && startDate > due) throw new AppError2("Ng\xE0y b\u1EAFt \u0111\u1EA7u kh\xF4ng \u0111\u01B0\u1EE3c sau h\u1EA1n ch\xF3t.");
          const tags = cleanTags(t.tags), subtasks = cleanSubtasks(t.subtasks), desc = cleanRich(t.description, 2e4);
          const estHours = t.estHours === void 0 && old ? old.t.est_hours == null ? null : Number(old.t.est_hours) : cleanHours(t.estHours);
          const followers = Array.isArray(t.followerIds) ? cleanFollowers(c, t.followerIds, assignees, old ? old.followers : []) : null;
          if (old) {
            await c.q.query(
              "UPDATE tasks SET title=$2, description=$3, priority=$4, due=$5, tags=$6, subtasks=$7, start_date=$8, est_hours=$9 WHERE id=$1",
              [t.id, title, desc, priority, due, JSON.stringify(tags), JSON.stringify(subtasks), startDate, estHours]
            );
          } else {
            const status = STATUSES.includes(t.status) ? t.status : "todo";
            const okrId = t.okrId ? str2(t.okrId) : null;
            await c.q.query(
              `INSERT INTO tasks(id,title,assignee_id,okr_id,week,year,due,status,created_at,project_id,description,priority,tags,subtasks,recurrence,created_by,position,completed_at,series_id,start_date,est_hours)
          VALUES($1,$2,$3,$4,0,0,$5,$6,$7,$8,$9,$10,$11,$12,NULL,$13,$14,$15,'',$16,$17)`,
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
                status === "done" ? (/* @__PURE__ */ new Date()).toISOString() : "",
                startDate,
                estHours
              ]
            );
          }
          await writeAssignees(c, t.id, assignees, pc);
          if (followers) await writeFollowers(c, t.id, followers, pc);
          const newcomers = assignees.filter((a) => !prev.includes(a) && a !== c.me.id);
          if (c.notes && newcomers.length) c.notes.push({ kind: "assigned", to: newcomers, actorId: c.me.id, task: { id: t.id, title, due, startDate, priority, project: pc.p.name } });
          const newFollowers = followers ? followers.filter((f) => !(old ? old.followers : []).includes(f) && f !== c.me.id) : [];
          if (c.notes && newFollowers.length) c.notes.push({ kind: "follower", to: newFollowers, actorId: c.me.id, task: { id: t.id, title } });
          return {};
        },
        /** Giao lại công việc cho người khác: người đang thực hiện, người tạo hoặc cấp trên; không giới hạn theo cấp bậc. Ghi lại vào bình luận. */
        async reassignTask(c, p) {
          const tc = await taskCtx(c, p.id);
          if (!tc) throw new AppError2("Kh\xF4ng t\xECm th\u1EA5y c\xF4ng vi\u1EC7c.");
          if (!canEditTask(c, tc.t, tc.assignees)) deny2(tc.canView && tc.followers.includes(c.me.id) ? "Ng\u01B0\u1EDDi theo d\xF5i ch\u1EC9 xem v\xE0 b\xECnh lu\u1EADn, kh\xF4ng giao l\u1EA1i \u0111\u01B0\u1EE3c c\xF4ng vi\u1EC7c." : "Ch\u1EC9 ng\u01B0\u1EDDi t\u1EA1o, ng\u01B0\u1EDDi \u0111ang th\u1EF1c hi\u1EC7n ho\u1EB7c c\u1EA5p tr\xEAn m\u1EDBi giao l\u1EA1i \u0111\u01B0\u1EE3c c\xF4ng vi\u1EC7c n\xE0y.");
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
          const toMail = added.filter((a) => a !== c.me.id);
          if (c.notes && toMail.length) c.notes.push({ kind: "reassigned", to: toMail, actorId: c.me.id, task: { id: tc.t.id, title: tc.t.title, due: tc.t.due, startDate: tc.t.start_date || "", priority: tc.t.priority, project: tc.p ? tc.p.name : "" } });
          return {};
        },
        /** Tick / bỏ tick một việc con (tiến độ) — chỉ đổi trạng thái xong, không đổi nội dung việc con. */
        async toggleSubtask(c, p) {
          const tc = await taskCtx(c, p.id);
          if (!tc) throw new AppError2("Kh\xF4ng t\xECm th\u1EA5y c\xF4ng vi\u1EC7c.");
          if (!canEditTask(c, tc.t, tc.assignees)) deny2(tc.canView && tc.followers.includes(c.me.id) ? "Ng\u01B0\u1EDDi theo d\xF5i ch\u1EC9 xem v\xE0 b\xECnh lu\u1EADn, kh\xF4ng c\u1EADp nh\u1EADt \u0111\u01B0\u1EE3c ti\u1EBFn \u0111\u1ED9." : "B\u1EA1n kh\xF4ng c\u1EADp nh\u1EADt \u0111\u01B0\u1EE3c ti\u1EBFn \u0111\u1ED9 c\xF4ng vi\u1EC7c n\xE0y.");
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
          if (!canEditTask(c, tc.t, tc.assignees)) deny2(tc.canView && tc.followers.includes(c.me.id) ? "Ng\u01B0\u1EDDi theo d\xF5i ch\u1EC9 xem v\xE0 b\xECnh lu\u1EADn, kh\xF4ng \u0111\u1ED5i \u0111\u01B0\u1EE3c tr\u1EA1ng th\xE1i c\xF4ng vi\u1EC7c." : "B\u1EA1n ch\u1EC9 chuy\u1EC3n \u0111\u01B0\u1EE3c tr\u1EA1ng th\xE1i vi\u1EC7c c\u1EE7a m\xECnh ho\u1EB7c c\u1EE7a c\u1EA5p d\u01B0\u1EDBi.");
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
          if (!canEditTask(c, tc.t, tc.assignees)) deny2(tc.canView && tc.followers.includes(c.me.id) ? "Ng\u01B0\u1EDDi theo d\xF5i ch\u1EC9 xem v\xE0 b\xECnh lu\u1EADn, kh\xF4ng \u0111\u1ED5i \u0111\u01B0\u1EE3c tr\u1EA1ng th\xE1i c\xF4ng vi\u1EC7c." : void 0);
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
          const due = normDue(t.due), today = todayISO2();
          return actions.saveTask(c, { task: { id: t.id, title: t.title, due: t.due, startDate: t.startDate || (due && due < today ? due : today), okrId: t.okrId, projectId: DEFAULT_PROJECT, assigneeIds: [t.assigneeId || c.me.id], status: "todo" } });
        },
        async deleteTask(c, p) {
          const tc = await taskCtx(c, p.id);
          if (!tc) return;
          if (!tc.canView || !canDeleteTask(c, tc.t, tc.assignees)) deny2("B\u1EA1n kh\xF4ng \u0111\u01B0\u1EE3c xo\xE1 c\xF4ng vi\u1EC7c n\xE0y.");
          await c.q.query("DELETE FROM tasks WHERE id=$1", [p.id]);
          removeTaskFiles([p.id]);
        },
        /**
         * Đặt lại danh sách người theo dõi { id, followerIds } — người tạo, người thực hiện hoặc Giám đốc.
         * Người thực hiện tự bị loại khỏi danh sách; người mới được nhắc tên trong 1 bình luận hệ thống và tự vào dự án đóng.
         */
        async setFollowers(c, p) {
          const tc = await taskCtx(c, p.id);
          if (!tc || !tc.canView) throw new AppError2("Kh\xF4ng t\xECm th\u1EA5y c\xF4ng vi\u1EC7c.");
          if (!canFollowTask(c, tc.t, tc.assignees)) deny2("Ch\u1EC9 ng\u01B0\u1EDDi t\u1EA1o, ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n ho\u1EB7c Gi\xE1m \u0111\u1ED1c m\u1EDBi th\xEAm/b\u1EDBt \u0111\u01B0\u1EE3c ng\u01B0\u1EDDi theo d\xF5i.");
          if (tc.p && tc.p.archived) throw new AppError2("D\u1EF1 \xE1n \u0111\xE3 l\u01B0u tr\u1EEF, kh\xF4ng \u0111\u1ED5i ng\u01B0\u1EDDi theo d\xF5i \u0111\u01B0\u1EE3c.");
          const ids = cleanFollowers(c, p.followerIds, tc.assignees, tc.followers);
          if (ids.length === tc.followers.length && ids.every((f) => tc.followers.includes(f))) return {};
          await writeFollowers(c, tc.t.id, ids, { p: tc.p, members: tc.members });
          const name = (id) => (c.byId[id] || { name: "?" }).name, list = (a) => a.length ? a.map(name).join(", ") : "(kh\xF4ng c\xF3)";
          const added = ids.filter((f) => !tc.followers.includes(f));
          await c.q.query(
            "INSERT INTO task_comments(id,task_id,author_id,text,created_at,mentions) VALUES($1,$2,$3,$4,$5,$6)",
            [newId("c"), tc.t.id, c.me.id, "\u0110\xE3 c\u1EADp nh\u1EADt ng\u01B0\u1EDDi theo d\xF5i: " + list(tc.followers) + " \u2192 " + list(ids), (/* @__PURE__ */ new Date()).toISOString(), JSON.stringify(added.filter((f) => f !== c.me.id))]
          );
          const toNote = added.filter((f) => f !== c.me.id);
          if (c.notes && toNote.length) c.notes.push({ kind: "follower", to: toNote, actorId: c.me.id, task: { id: tc.t.id, title: tc.t.title } });
          return {};
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
          const tags = cleanTags(r.tags), subtasks = cleanSubtasks(r.subtasks).map((s) => ({ ...s, done: false })), desc = cleanRich(r.description, 2e4);
          const estHours = r.estHours === void 0 && old ? old.est_hours == null ? null : Number(old.est_hours) : cleanHours(r.estHours);
          const followers = Array.isArray(r.followerIds) ? cleanFollowers(c, r.followerIds, ids, old ? idList(old.followers) : []) : old ? idList(old.followers).filter((f) => !ids.includes(f)) : [];
          const open = old ? await one2(c.q, `SELECT 1 FROM tasks WHERE series_id=$1 AND status <> 'done' LIMIT 1`, [r.id]) : null;
          let due = "", pendingDue = old ? old.next_due || "" : "";
          const today = todayISO2();
          if (!old) {
            due = normDue(r.firstDue) || today;
            if (rule.end && due > rule.end) throw new AppError2("Ng\xE0y k\u1EBFt th\xFAc l\u1EB7p l\u1EA1i ph\u1EA3i sau h\u1EA1n ch\xF3t \u0111\u1EA7u ti\xEAn.");
          } else if (!open) {
            const baseDay = pendingDue && pendingDue > today ? pendingDue : today;
            due = nextDue(rule, isoOf(addDays(parseISO(baseDay), -1)), today);
            if (!due) throw new AppError2("L\u1ECBch l\u1EB7p \u0111\xE3 qu\xE1 ng\xE0y k\u1EBFt th\xFAc. H\xE3y ch\u1ECDn ng\xE0y k\u1EBFt th\xFAc mu\u1ED9n h\u01A1n.");
            pendingDue = due > today ? due : "";
            if (due > today) due = "";
          } else pendingDue = "";
          const now = (/* @__PURE__ */ new Date()).toISOString();
          const row = [r.id, projectId, title, desc, priority, JSON.stringify(tags), JSON.stringify(subtasks), JSON.stringify(ids), JSON.stringify(rule), JSON.stringify(followers), estHours, pendingDue];
          if (old) await c.q.query("UPDATE recurring_tasks SET project_id=$2, title=$3, description=$4, priority=$5, tags=$6, subtasks=$7, assignees=$8, rule=$9, followers=$10, est_hours=$11, next_due=$12, updated_at=$13 WHERE id=$1", [...row, now]);
          else await c.q.query("INSERT INTO recurring_tasks(id,project_id,title,description,priority,tags,subtasks,assignees,rule,followers,est_hours,next_due,created_by,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)", [...row, c.me.id, now]);
          const result = {};
          if (due) {
            const tpl = await one2(c.q, "SELECT * FROM recurring_tasks WHERE id=$1", [r.id]);
            const id = await spawnInstance(c, tpl, rule, due);
            if (id) {
              result.spawned = { id, due, title };
              await c.q.query(`UPDATE tasks SET spawned_id=$2 WHERE series_id=$1 AND spawned_id=$3`, [r.id, id, PENDING]);
            }
          } else if (pendingDue) result.scheduled = { due: pendingDue, title };
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
          if (!safeId(cm.id) || !safeId(cm.taskId)) throw new AppError2("Thi\u1EBFu n\u1ED9i dung b\xECnh lu\u1EADn.");
          const text = cleanText(cm.text, 12e3);
          if (!plainOf(text).trim()) throw new AppError2("Thi\u1EBFu n\u1ED9i dung b\xECnh lu\u1EADn.");
          const tc = await taskCtx(c, cm.taskId);
          if (!tc) throw new AppError2("C\xF4ng vi\u1EC7c kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i.");
          if (!tc.canView) deny2();
          const mentions = idList(cm.mentions).filter((id) => c.byId[id]).slice(0, 20);
          await c.q.query(
            "INSERT INTO task_comments(id,task_id,author_id,text,created_at,mentions) VALUES($1,$2,$3,$4,$5,$6)",
            [cm.id, cm.taskId, c.me.id, text, (/* @__PURE__ */ new Date()).toISOString(), JSON.stringify(mentions)]
          );
          const toMail = uniq([tc.t.created_by, ...tc.assignees, ...tc.followers, ...mentions].filter((id) => id && id !== c.me.id));
          if (c.notes && toMail.length) c.notes.push({ kind: "taskComment", to: toMail, actorId: c.me.id, task: { id: tc.t.id, title: tc.t.title }, text: plainOf(text).trim().slice(0, 600) });
        },
        async deleteTaskComment(c, p) {
          const row = await one2(c.q, "SELECT author_id, task_id FROM task_comments WHERE id=$1", [p.id]);
          if (!row) return;
          const tc = await taskCtx(c, row.task_id);
          if (!tc || !tc.canView) deny2();
          if (row.author_id !== c.me.id && c.me.role !== "director") deny2("Ch\u1EC9 ng\u01B0\u1EDDi vi\u1EBFt ho\u1EB7c Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c xo\xE1 b\xECnh lu\u1EADn n\xE0y.");
          await c.q.query("DELETE FROM task_comments WHERE id=$1", [p.id]);
        },
        async deleteAttachment(c, p) {
          const a = await one2(c.q, "SELECT * FROM task_attachments WHERE id=$1", [p.id]);
          if (!a) return;
          const tc = await taskCtx(c, a.task_id);
          if (!tc || !tc.canView) deny2();
          if (a.uploaded_by !== c.me.id && !canEditTask(c, tc.t, tc.assignees)) deny2("B\u1EA1n kh\xF4ng \u0111\u01B0\u1EE3c xo\xE1 t\u1EC7p n\xE0y.");
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
        if (!tc.canView) deny2();
        if (!canEditTask(c, tc.t, tc.assignees)) deny2(tc.followers.includes(c.me.id) ? "Ng\u01B0\u1EDDi theo d\xF5i ch\u1EC9 xem v\xE0 t\u1EA3i t\u1EC7p, kh\xF4ng \u0111\xEDnh k\xE8m t\u1EC7p \u0111\u01B0\u1EE3c." : "B\u1EA1n kh\xF4ng \u0111\xEDnh k\xE8m \u0111\u01B0\u1EE3c t\u1EC7p v\xE0o c\xF4ng vi\u1EC7c n\xE0y.");
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
      const IMG_EXT = /* @__PURE__ */ new Set(["png", "jpg", "jpeg", "gif", "webp"]);
      const inlineDir = () => path.join(UPLOAD_DIR, ".inline");
      const imageKind = (b) => b.length >= 12 && (b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71 ? "png" : b[0] === 255 && b[1] === 216 && b[2] === 255 ? "jpg" : b.toString("latin1", 0, 4) === "GIF8" ? "gif" : b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP" ? "webp" : "");
      async function uploadInline(c, req, params) {
        const name = cleanFileName(params.name), ext = extOf(name);
        if (!IMG_EXT.has(ext)) throw new AppError2("Ch\u1EC9 d\xE1n \u0111\u01B0\u1EE3c \u1EA3nh PNG, JPG, GIF ho\u1EB7c WebP.");
        const declared = Number(req.headers["content-length"] || 0);
        if (declared > MAX_FILE) throw new AppError2("\u1EA2nh qu\xE1 l\u1EDBn (t\u1ED1i \u0111a " + Math.round(MAX_FILE / 1048576) + "MB).");
        const id = newId("i"), dir = inlineDir(), file = path.join(dir, id);
        try {
          fs2.mkdirSync(dir, { recursive: true });
        } catch (e) {
          console.error(e);
          throw new AppError2("M\xE1y ch\u1EE7 ch\u01B0a c\u1EA5u h\xECnh \u0111\u01B0\u1EE3c n\u01A1i l\u01B0u \u1EA3nh.");
        }
        let size = 0;
        const counter = new Transform({ transform(chunk, _enc, cb) {
          size += chunk.length;
          if (size > MAX_FILE) cb(new AppError2("\u1EA2nh qu\xE1 l\u1EDBn (t\u1ED1i \u0111a " + Math.round(MAX_FILE / 1048576) + "MB)."));
          else cb(null, chunk);
        } });
        try {
          await pipeline(req, counter, fs2.createWriteStream(file, { flags: "wx", mode: 416 }));
          if (!size) throw new AppError2("\u1EA2nh r\u1ED7ng.");
          const fd = fs2.openSync(file, "r"), head = Buffer.alloc(12);
          try {
            fs2.readSync(fd, head, 0, 12, 0);
          } finally {
            fs2.closeSync(fd);
          }
          const kind = imageKind(head);
          if (!kind) throw new AppError2("T\u1EC7p kh\xF4ng ph\u1EA3i \u1EA3nh h\u1EE3p l\u1EC7.");
          const mime = MIME[kind], now = (/* @__PURE__ */ new Date()).toISOString();
          await c.q.query("INSERT INTO inline_images(id,name,mime,size,uploaded_by,created_at) VALUES($1,$2,$3,$4,$5,$6)", [id, name, mime, size, c.me.id, now]);
          return { id, name, mime, size };
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
        if (!a) {
          const im = await one2(c.q, "SELECT * FROM inline_images WHERE id=$1", [attId]);
          if (!im) throw new AppError2("Kh\xF4ng t\xECm th\u1EA5y t\u1EC7p.");
          const f = path.join(inlineDir(), im.id);
          let st2;
          try {
            st2 = fs2.statSync(f);
          } catch (e) {
            throw new AppError2("\u1EA2nh kh\xF4ng c\xF2n tr\xEAn m\xE1y ch\u1EE7.");
          }
          res.writeHead(200, {
            "Content-Type": im.mime || "application/octet-stream",
            "Content-Length": st2.size,
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline; filename*=UTF-8''" + encodeURIComponent(im.name),
            "Cache-Control": "private, max-age=86400",
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox"
          });
          return fs2.createReadStream(f).pipe(res);
        }
        const tc = await taskCtx(c, a.task_id);
        if (!tc || !tc.canView) deny2("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n xem t\u1EC7p n\xE0y.");
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
      return {
        SCHEMA: SCHEMA2,
        migrate: migrate2,
        actions,
        loadWork,
        loadTaskDetail,
        upload,
        uploadInline,
        download,
        spawnDueRecurring,
        removeTaskFiles,
        STATUSES,
        DEFAULT_PROJECT,
        loadPeople,
        filterVisibleTasks,
        visibleToViewer,
        isTopRole,
        cleanRich,
        cleanText,
        plainOf
      };
    };
    module2.exports.recurrence = { cleanRule, nextAfter, nextDue, validISO };
    module2.exports.cleanRich = cleanRich;
    module2.exports.plainOf = plainOf;
    module2.exports.RT = RT;
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
var makeMail = require_mail();
var N = require_notify();
var PORT = Number(process.env.PORT || 3100);
var TOKEN_SECRET = process.env.TOKEN_SECRET || "";
var TOKEN_DAYS = 30;
var ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim()).filter(Boolean);
var VERSION = 16;
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
  await pool.query(N.SCHEMA);
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT ''");
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
  const r = await q.query("SELECT id, username, name, role, dept, title, color, manager_id, active, email FROM users ORDER BY seq");
  return normalizeRoles(r.rows.map((u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, dept: u.dept, title: u.title, color: u.color, managerId: u.manager_id, active: u.active !== false, email: u.email || "" })));
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
  const publicUsers = db.users.map(({ email, ...u }) => u);
  return { users: db.users, json: JSON.stringify({ cycles: db.cycles, users: publicUsers, okrs: db.okrs, reports: db.reports }).slice(1, -1) };
}
async function viewerTasks(viewer, users) {
  const c = ctxFor(viewer, users);
  let sql = `SELECT t.* FROM tasks t WHERE (t.report_id IS NOT NULL OR t.project_id = '${W.DEFAULT_PROJECT}')`, args = [];
  if (!W.isTopRole(c)) {
    const ids = [c.me.id, ...users.filter((u) => canManage(c, u.id)).map((u) => u.id)];
    sql += ` AND (t.created_by = ANY($1) OR t.assignee_id = ANY($1) OR EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = t.id AND a.user_id = ANY($1))
      OR EXISTS (SELECT 1 FROM task_followers f WHERE f.task_id = t.id AND f.user_id = $2))`;
    args = [ids, c.me.id];
  }
  const tr = await pool.query(sql + " ORDER BY t.seq", args);
  const { asg, fol } = await W.loadPeople(pool, tr.rows);
  const vis = W.filterVisibleTasks(c, tr.rows, asg, fol);
  const by = {};
  if (vis.length) {
    const cr = await pool.query("SELECT * FROM task_comments WHERE task_id = ANY($1) ORDER BY seq", [vis.map((v) => v.t.id)]);
    cr.rows.forEach((c2) => {
      (by[c2.task_id] = by[c2.task_id] || []).push({ id: c2.id, authorId: c2.author_id, text: c2.text, createdAt: c2.created_at });
    });
  }
  return vis.map(({ t, followers }) => ({
    id: t.id,
    title: t.title,
    assigneeId: t.assignee_id,
    followerIds: followers,
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
  let emails = "";
  if (viewer && viewer.role === "director") {
    const m = {};
    pub.users.forEach((u) => {
      if (u.email) m[u.id] = u.email;
    });
    emails = ',"emails":' + JSON.stringify(m);
  }
  return head + ',"db":{' + pub.json + emails + ',"tasks":' + JSON.stringify(tasks) + ',"viewerId":' + JSON.stringify(viewer ? viewer.id : null) + ',"loadedAt":"' + (/* @__PURE__ */ new Date()).toISOString() + '"}}';
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
    tasks = await viewerTasks(viewer, (await ctx(viewer)).users);
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
var M = makeMail({ pool });
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
var REPORT_MAX = 5e4;
function cleanKrUpdates(v) {
  return (Array.isArray(v) ? v : []).map((ku) => {
    const out = { ...ku };
    for (const k of ["work", "issues", "causes"]) if (k in out) out[k] = W.cleanRich(out[k], REPORT_MAX);
    return out;
  });
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
    const kus = cleanKrUpdates(r.krUpdates);
    await c.q.query(
      `INSERT INTO reports(id,user_id,week,year,okr_id,created_at,work,issues,causes,kr_updates,solutions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        r.id,
        c.me.id,
        num(r.week),
        num(r.year),
        r.okrId,
        str(r.createdAt) || (/* @__PURE__ */ new Date()).toISOString(),
        W.cleanRich(r.work, REPORT_MAX),
        W.cleanRich(r.issues, REPORT_MAX),
        W.cleanRich(r.causes, REPORT_MAX),
        JSON.stringify(kus),
        JSON.stringify(r.solutions || [])
      ]
    );
    for (const ku of kus) await c.q.query("UPDATE krs SET current = $1 WHERE id = $2 AND okr_id = $3", [num(ku.value), ku.krId, okr.id]);
    const krOf = await solutionKrMap(c.q, okr.id, kus);
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
    const kus = cleanKrUpdates(r.krUpdates);
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
      [old.id, W.cleanRich(r.work, REPORT_MAX), W.cleanRich(r.issues, REPORT_MAX), W.cleanRich(r.causes, REPORT_MAX), JSON.stringify(kus), JSON.stringify(solutions)]
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
  /* Bình luận / ghi chú trên công việc, addTask/updateTask/deleteTask: do src/work.js định nghĩa (W.actions) theo quy tắc xem/sửa/xoá v11. */
  async addComment(c, p) {
    const cm = p.comment;
    const text = cm && W.cleanRich(cm.text, 12e3);
    if (!cm || !cm.id || !cm.reportId || !W.plainOf(text).trim()) throw new AppError("Thi\u1EBFu n\u1ED9i dung ph\u1EA3n h\u1ED3i.");
    const r = await one(c.q, "SELECT user_id FROM reports WHERE id=$1", [cm.reportId]);
    if (!r) throw new AppError("B\xE1o c\xE1o kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i.");
    if (r.user_id !== c.me.id && !canManage(c, r.user_id)) deny("Ch\u1EC9 c\u1EA5p tr\xEAn c\u1EE7a ng\u01B0\u1EDDi vi\u1EBFt ho\u1EB7c Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c ph\u1EA3n h\u1ED3i b\xE1o c\xE1o n\xE0y.");
    await c.q.query("INSERT INTO comments(id,report_id,author_id,text,created_at,acknowledged) VALUES($1,$2,$3,$4,$5,false)", [cm.id, cm.reportId, c.me.id, text, str(cm.createdAt) || (/* @__PURE__ */ new Date()).toISOString()]);
    if (c.notes && r.user_id !== c.me.id) {
      const rep = await one(c.q, "SELECT r.week, r.year, o.title FROM reports r LEFT JOIN okrs o ON o.id = r.okr_id WHERE r.id=$1", [cm.reportId]);
      c.notes.push({ kind: "reportFeedback", to: [r.user_id], actorId: c.me.id, report: { id: cm.reportId, week: rep ? rep.week : "", year: rep ? rep.year : "", okrTitle: rep ? rep.title || "" : "" }, text: W.plainOf(text).trim().slice(0, 600) });
    }
  },
  async ackComment(c, p) {
    const row = await one(c.q, "SELECT r.user_id FROM comments cm JOIN reports r ON r.id = cm.report_id WHERE cm.id=$1", [p.id]);
    if (!row) throw new AppError("Kh\xF4ng t\xECm th\u1EA5y ph\u1EA3n h\u1ED3i.");
    if (row.user_id !== c.me.id) deny("Ch\u1EC9 ng\u01B0\u1EDDi vi\u1EBFt b\xE1o c\xE1o \u0111\u01B0\u1EE3c x\xE1c nh\u1EADn ch\u1EC9 \u0111\u1EA1o.");
    await c.q.query("UPDATE comments SET acknowledged=true, ack_at=$2 WHERE id=$1", [p.id, str(p.ackAt) || (/* @__PURE__ */ new Date()).toISOString()]);
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
    const boss = c.byId[o.ownerId].managerId;
    if (c.notes && !approved && boss && boss !== c.me.id) c.notes.push({ kind: "okrPending", to: [boss], actorId: c.me.id, okr: { id: o.id, title: str(o.title) } });
  },
  async reviewOKR(c, p) {
    if (!p.id || !["approved", "rejected"].includes(p.status)) throw new AppError("Thi\u1EBFu d\u1EEF li\u1EC7u duy\u1EC7t.");
    const o = await one(c.q, "SELECT owner_id, title FROM okrs WHERE id=$1", [p.id]);
    if (!o) throw new AppError("Kh\xF4ng t\xECm th\u1EA5y OKR.");
    if (!canManage(c, o.owner_id)) deny("Ch\u1EC9 c\u1EA5p tr\xEAn c\u1EE7a ng\u01B0\u1EDDi ph\u1EE5 tr\xE1ch ho\u1EB7c Gi\xE1m \u0111\u1ED1c \u0111\u01B0\u1EE3c duy\u1EC7t OKR n\xE0y.");
    await c.q.query("UPDATE okrs SET status=$2, review_note=$3, updated_at=$4 WHERE id=$1", [p.id, p.status, str(p.reviewNote), str(p.updatedAt) || (/* @__PURE__ */ new Date()).toISOString()]);
    if (c.notes && o.owner_id !== c.me.id) c.notes.push({ kind: p.status === "approved" ? "okrApproved" : "okrRejected", to: [o.owner_id], actorId: c.me.id, okr: { id: p.id, title: o.title, note: str(p.reviewNote) } });
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
    let email = old ? old.email || "" : "";
    if (u.email !== void 0) {
      email = str(u.email).trim().toLowerCase();
      if (email && (email.length > 120 || !makeMail.EMAIL_RE.test(email))) throw new AppError('Email "' + str(u.email).trim().slice(0, 60) + '" kh\xF4ng h\u1EE3p l\u1EC7.');
    }
    if (old) {
      await c.q.query("UPDATE users SET username=$2, name=$3, role=$4, dept=$5, title=$6, color=$7, manager_id=$8, email=$9 WHERE id=$1", [id, username, name, role, str(u.dept), str(u.title), color, mgrId, email]);
      if (u.password) await c.q.query("UPDATE users SET pass_hash=$2 WHERE id=$1", [id, hashPassword(u.password)]);
    } else {
      await c.q.query(
        "INSERT INTO users(id,username,pass_hash,name,role,dept,title,color,manager_id,email) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [id, username, hashPassword(u.password), name, role, str(u.dept), str(u.title), color, mgrId, email]
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
      + (SELECT count(*) FROM task_followers WHERE user_id=$1) + (SELECT count(*) FROM task_comments WHERE author_id=$1) + (SELECT count(*) FROM comments WHERE author_id=$1) AS n`, [u.id]);
    if (Number(used.n)) throw new AppError(u.name + ' \u0111\xE3 c\xF3 OKR, b\xE1o c\xE1o, c\xF4ng vi\u1EC7c ho\u1EB7c ph\u1EA3n h\u1ED3i trong h\u1EC7 th\u1ED1ng n\xEAn kh\xF4ng xo\xE1 \u0111\u01B0\u1EE3c. H\xE3y d\xF9ng "Kho\xE1 t\xE0i kho\u1EA3n" \u0111\u1EC3 gi\u1EEF l\u1EA1i l\u1ECBch s\u1EED.');
    await c.q.query("DELETE FROM workspace_members WHERE user_id=$1", [u.id]);
    await c.q.query("DELETE FROM project_members WHERE user_id=$1", [u.id]);
    await c.q.query("DELETE FROM notifications WHERE user_id=$1", [u.id]);
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
A.notifMark = async (c, p) => {
  await N.mark(c.q, c.me.id, p);
  return N.list(c.q, c.me.id);
};
A.notifRemove = async (c, p) => {
  await N.remove(c.q, c.me.id, p);
  return N.list(c.q, c.me.id);
};
var QUIET = /* @__PURE__ */ new Set(["notifMark", "notifRemove"]);
var BOOT = Date.now().toString(36);
var notifSeq = 0;
var notifStamps = /* @__PURE__ */ new Map();
var touchNotif = (ids) => {
  for (const id of ids) notifStamps.set(id, BOOT + "." + ++notifSeq);
};
var stampOf = (id) => notifStamps.get(id) || BOOT + ".0";
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
  const today = todayISO(), due = str(t.due), start = /^\d{4}-\d{2}-\d{2}$/.test(str(t.startDate)) ? str(t.startDate) : due && due < today ? due : today;
  await q.query(
    `INSERT INTO tasks(id,title,assignee_id,report_id,solution_id,okr_id,week,year,due,status,created_at,project_id,created_by,kr_id,start_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      t.id,
      str(t.title),
      t.assigneeId,
      t.reportId || null,
      t.solutionId || null,
      t.okrId || null,
      num(t.week),
      num(t.year),
      due,
      W.STATUSES.includes(t.status) ? t.status : "todo",
      str(t.createdAt) || (/* @__PURE__ */ new Date()).toISOString(),
      t.projectId || W.DEFAULT_PROJECT,
      str(t.createdBy) || t.assigneeId,
      str(t.krId),
      start
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
      if (url.searchParams.get("notif")) {
        if (!viewer2) throw authError("Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i \u0111\u1EC3 ti\u1EBFp t\u1EE5c.");
        const nv = stampOf(viewer2.id);
        if (url.searchParams.get("nv") === nv) return send(res, { ok: true, unchanged: true, nv });
        return send(res, { ok: true, nv, ...await N.list(pool, viewer2.id) }, 200, req);
      }
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
    if (url.pathname.endsWith("/upload-inline")) {
      const viewer2 = await verifyToken(req.headers["x-okr-token"]);
      const file = await W.uploadInline(await ctx(viewer2), req, { name: url.searchParams.get("name") });
      return send(res, { ok: true, image: file });
    }
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
    const notes = [];
    let recipients = [];
    const result = await tx(async (client) => {
      const c = await ctx(viewer, client);
      c.notes = notes;
      const out = await A[action](c, p);
      recipients = await N.save(client, notes, c.byId);
      return out;
    });
    if (QUIET.has(action)) {
      touchNotif([viewer.id]);
      result.nv = stampOf(viewer.id);
    } else bumpVersion();
    touchNotif(recipients);
    M.queue(notes);
    if (body.lite) return send(res, { ok: true, version: dataVersion, result });
    viewer = (await getUsers()).find((u) => u.id === viewer.id) || viewer;
    return send(res, await dbResponse(viewer, { result }), 200, req);
  } catch (e) {
    errOut(res, e);
  }
}
var dueRunning = false;
async function runDueRecurring() {
  if (dueRunning) return;
  dueRunning = true;
  try {
    const made = await tx(async (client) => {
      const users = await getUsers(client), byId = {};
      users.forEach((u) => {
        byId[u.id] = u;
      });
      const me = users.find((u) => u.role === "director" && u.active) || users.find((u) => u.active) || { id: "" };
      return W.spawnDueRecurring({ q: client, me, users, byId });
    });
    if (made) bumpVersion();
  } catch (e) {
    console.error((/* @__PURE__ */ new Date()).toISOString(), "T\u1EA1o vi\u1EC7c l\u1EB7p l\u1EA1i \u0111\u1EBFn ng\xE0y l\u1ED7i:", e.message || e);
  } finally {
    dueRunning = false;
  }
}
async function importDB(db, opts = {}) {
  const existing = await one(pool, "SELECT count(*)::int AS n FROM users");
  if (existing.n && !opts.force) throw new Error("C\u01A1 s\u1EDF d\u1EEF li\u1EC7u \u0111\xE3 c\xF3 d\u1EEF li\u1EC7u (" + existing.n + " ng\u01B0\u1EDDi d\xF9ng). Th\xEAm --force \u0111\u1EC3 ghi \u0111\xE8.");
  const temp = [];
  await tx(async (q) => {
    if (opts.force) await q.query("TRUNCATE comments, krs, reports, okrs, tasks, cycles, users, notifications CASCADE");
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
  runDueRecurring();
  setInterval(runDueRecurring, 5 * 6e4).unref();
}
main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
