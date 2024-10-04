// src/ps/connected-domain.js
module.exports = function(tdArray, indicator, hardlink) {
  hardlink = hardlink || false;
  if (!tdArray) {
    throw new Error("tdArray must be provided");
  }
  if (!indicator) {
    throw new Error("indicator must be provided");
  }
  tdArray = JSON.parse(JSON.stringify(tdArray));
  var domains = {};
  var domainUUID = 0;
  var pointsHash = {};
  tdArray.forEach(function(row, y) {
    row.forEach(function(colItem, x) {
      var identifier2 = indicator(colItem, x, y);
      var neighbours = [];
      if (tdArray[y - 1] && tdArray[y - 1][x] !== void 0) {
        neighbours.push(pointsHash[x + "_" + (y - 1)]);
      }
      if (row[x - 1] !== void 0) {
        neighbours.push(pointsHash[x - 1 + "_" + y]);
      }
      if (!hardlink) {
        if (tdArray[y - 1] && tdArray[y - 1][x - 1] !== void 0) {
          neighbours.push(pointsHash[x - 1 + "_" + (y - 1)]);
        }
        if (tdArray[y - 1] && tdArray[y - 1][x + 1] !== void 0) {
          neighbours.push(pointsHash[x + 1 + "_" + (y - 1)]);
        }
      }
      if (neighbours.length) {
        var matched = false;
        neighbours.forEach(function(neighbour) {
          if (neighbour.identifier == identifier2) {
            if (!matched) {
              addPointToDomain(colItem, x, y, neighbour.domainId);
              matched = true;
            } else {
              var colItemPoint = pointsHash[x + "_" + y];
              if (neighbour.domainId != colItemPoint.domainId) {
                mergeDomains(neighbour.domainId, colItemPoint.domainId);
              }
            }
          }
        });
        if (!matched) {
          addNewDomain(colItem, x, y, identifier2);
        }
      } else {
        addNewDomain(colItem, x, y, identifier2);
      }
    });
  });
  var result = {
    domains: [],
    totalDomains: 0,
    groupByIdentifier: {},
    totalIdentifiers: 0
  };
  var domainId = null;
  var identifier = null;
  var domain = null;
  for (domainId in domains) {
    domain = domains[domainId];
    domain.bounding = calculateBounding(domain.points);
    identifier = domain.identifier;
    result.domains.push(domain);
    result.totalDomains++;
    if (!(identifier in result.groupByIdentifier)) {
      result.groupByIdentifier[identifier] = [];
      result.totalIdentifiers++;
    }
    result.groupByIdentifier[identifier].push(domain);
  }
  function calculateBounding(points) {
    var minX = null;
    var minY = null;
    var maxX = null;
    var maxY = null;
    points.forEach(function(point) {
      if (minX === null || point.x < minX) {
        minX = point.x;
      }
      if (minY === null || point.y < minY) {
        minY = point.y;
      }
      if (maxX === null || point.x > maxX) {
        maxX = point.x;
      }
      if (maxY === null || point.y > maxY) {
        maxY = point.y;
      }
    });
    var w = maxX - minX;
    var h = maxY - minY;
    return {
      x: minX,
      y: minY,
      w,
      h
    };
  }
  function addNewDomain(point, x, y, identifier2) {
    var newDomain = {
      identifier: identifier2,
      domainId: ++domainUUID,
      bounding: {},
      points: []
    };
    var newPoint = {
      value: point,
      x,
      y,
      identifier: identifier2,
      domainId: newDomain.domainId
    };
    pointsHash[x + "_" + y] = {
      value: point,
      identifier: identifier2,
      domainId: newDomain.domainId
    };
    newDomain.points.push(newPoint);
    domains[newDomain.domainId] = newDomain;
  }
  function addPointToDomain(point, x, y, domainId2) {
    var domain2 = domains[domainId2];
    var newPoint = {
      value: point,
      x,
      y,
      identifier: domain2.identifier,
      domainId: domainId2
    };
    pointsHash[x + "_" + y] = {
      value: point,
      identifier: domain2.identifier,
      domainId: domainId2
    };
    domain2.points.push(newPoint);
  }
  function mergeDomains(domainAId, domainBId) {
    var domainA = domains[domainAId];
    var domainB = domains[domainBId];
    if (domainA.identifier == domainB.identifier) {
      domainB.domainId = domainA.domainId;
      domainB.points.forEach(function(point) {
        point.domainId = domainA.domainId;
        pointsHash[point.x + "_" + point.y].domainId = domainA.domainId;
      });
      domainA.points = domainA.points.concat(domainB.points);
      delete domains[domainBId];
    }
  }
  return result;
};
