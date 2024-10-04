import {
  require_connected_domain
} from "./chunk-ZY7AS7MC.mjs";
import {
  init_esm_shims
} from "./chunk-S5U5CNLS.mjs";
import {
  __commonJS
} from "./chunk-7I4CRWDS.mjs";

// src/ps/table-parser.js
var require_table_parser = __commonJS({
  "src/ps/table-parser.js"(exports, module) {
    init_esm_shims();
    var ConnectedDomain = require_connected_domain();
    var EMPTY_EX = /\s/;
    module.exports.parse = function(output) {
      var linesTmp = output.split(/(\r\n)|(\n\r)|\n|\r/);
      var lines = [];
      var titleInfo = {};
      var twoDimArray = [];
      linesTmp.forEach(function(line) {
        if (line && line.trim()) {
          lines.push(line);
        }
      });
      lines.forEach(function(line, index) {
        if (index == 0) {
          var fields = line.split(/\s+/);
          var currentIndex = 0;
          fields.forEach(function(field, idx) {
            if (field) {
              var info = titleInfo[field] = {};
              var indexBegin = line.indexOf(field, currentIndex);
              var indexEnd = currentIndex = indexBegin + field.length;
              if (idx == 0) {
                info.titleBegin = 0;
              } else {
                info.titleBegin = indexBegin;
              }
              if (idx == fields.length - 1) {
                info.titleEnd = line.length - 1;
              } else {
                info.titleEnd = indexEnd;
              }
            }
          });
        } else {
          twoDimArray[index - 1] = line.split("");
        }
      });
      var connectedDomains = ConnectedDomain(
        twoDimArray,
        function(value) {
          if (EMPTY_EX.test(value)) {
            return -1;
          } else {
            return 1;
          }
        },
        true
      );
      var valuesDomainsVerticalGroups = [];
      connectedDomains.domains.sort(function(a, b) {
        return a.bounding.x - b.bounding.x;
      });
      connectedDomains.domains.forEach(function(domain) {
        if (domain.identifier === 1) {
          var overlapped = false;
          valuesDomainsVerticalGroups.forEach(function(group) {
            var bounding = domain.bounding;
            var left = bounding.x;
            var right = bounding.x + bounding.w;
            if (overlap(left, right, group.begin, group.end)) {
              overlapped = true;
              group.domains.push(domain);
              group.begin = group.begin > left ? left : group.begin;
              group.end = group.end < right ? right : group.end;
            }
          });
          if (!overlapped) {
            valuesDomainsVerticalGroups.push({
              begin: domain.bounding.x,
              end: domain.bounding.x + domain.bounding.w,
              domains: [domain]
            });
          }
        }
      });
      valuesDomainsVerticalGroups.forEach(function(group) {
        var title = null;
        var info = null;
        var overlapped = false;
        var minimunLeftDistance = null;
        var nearestLeftTitle = null;
        var distance = null;
        for (title in titleInfo) {
          info = titleInfo[title];
          if (group.begin > info.titleBegin) {
            distance = group.begin - info.titleBegin;
            if (!nearestLeftTitle || distance < minimunLeftDistance) {
              nearestLeftTitle = title;
              minimunLeftDistance = distance;
            }
          }
          if (overlap(group.begin, group.end, info.titleBegin, info.titleEnd)) {
            overlapped = true;
            info.titleBegin = info.titleBegin > group.begin ? group.begin : info.titleBegin;
            info.titleEnd = info.titleEnd < group.end ? group.end : info.titleEnd;
          }
        }
        if (!overlapped && nearestLeftTitle) {
          var nearestTitleField = titleInfo[nearestLeftTitle];
          nearestTitleField.titleBegin = nearestTitleField.titleBegin > group.begin ? group.begin : nearestTitleField.titleBegin;
          nearestTitleField.titleEnd = nearestTitleField.titleEnd < group.end ? group.end : nearestTitleField.titleEnd;
        }
      });
      var result = [];
      lines.forEach(function(line, index) {
        if (index > 0) {
          var lineItem = {};
          var title = null;
          var info = null;
          var value = null;
          for (title in titleInfo) {
            info = titleInfo[title];
            value = line.substring(info.titleBegin, info.titleEnd + 1);
            lineItem[title] = splitValue(value.trim());
          }
          result.push(lineItem);
        }
      });
      return result;
    };
    function overlap(begin1, end1, begin2, end2) {
      return begin1 > begin2 && begin1 < end2 || // 2--1--2--1 or 2--1--1--2
      end1 > begin2 && end1 < end2 || // 1--2--1--2 or 2--1--1--2
      begin1 <= begin2 && end1 >= end2;
    }
    function splitValue(value) {
      var match = value.match(/"/g);
      if (!match || match.length == 1) {
        return value.split(/\s+/);
      } else {
        var result = [];
        var chunk = null;
        var ifInWrappedChunk = false;
        var ifInPureWrappedChunk = false;
        var quotaCount = 0;
        var maxQuotaCount = match.length % 2 == 0 ? match.length : match.length - 1;
        var previousItem = null;
        var values = value.split("");
        values.forEach(function(item, index) {
          if (item !== " ") {
            if (item === '"') {
              if (ifInWrappedChunk === false && quotaCount <= maxQuotaCount) {
                ifInWrappedChunk = true;
                quotaCount++;
                if (previousItem === " " || previousItem === null) {
                  ifInPureWrappedChunk = true;
                  chunk = "";
                } else {
                  chunk += item;
                }
              } else if (ifInWrappedChunk === true) {
                ifInWrappedChunk = false;
                quotaCount++;
                if (ifInPureWrappedChunk === true) {
                  ifInPureWrappedChunk = false;
                  result.push(chunk);
                  chunk = null;
                } else {
                  chunk += item;
                }
              }
            } else if (ifInWrappedChunk === false && (previousItem === " " || previousItem === null)) {
              chunk = item;
            } else {
              chunk += item;
            }
          } else if (ifInWrappedChunk) {
            chunk += item;
          } else if (chunk !== null) {
            result.push(chunk);
            chunk = null;
          }
          previousItem = item;
          if (index == values.length - 1 && chunk !== null) {
            result.push(chunk);
            chunk = null;
          }
        });
        return result;
      }
    }
  }
});

export {
  require_table_parser
};
