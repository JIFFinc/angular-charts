// Main module
angular.module('angularCharts', ['angularChartsTemplates']);
// Main directive handling drawing of all charts
angular.module('angularCharts').directive('acChart', [
  '$templateCache',
  '$compile',
  '$rootElement',
  '$window',
  '$timeout',
  '$sce',
  function ($templateCache, $compile, $rootElement, $window, $timeout, $sce) {
    // TODO: Add touch events
    var defaultColors = [
        'steelBlue',
        'rgb(255, 153,   0)',
        'rgb(220,  57,  18)',
        'rgb( 70, 132, 238)',
        'rgb( 73,  66, 204)',
        'rgb(  0, 128,   0)',
        'rgb(  0, 169, 221)',
        'rgb( 50, 205, 252)',
        'rgb(  5, 150, 194)',
        'rgb( 50, 183, 224)',
        'rgb(  2, 185, 241)',
        'rgb( 70, 132, 238)'
      ];
    // Utility function to call when we run out of colors
    // @return {String} Hexadecimal color
    function getRandomColor() {
      var r = (Math.round(Math.random() * 127) + 127).toString(16);
      var g = (Math.round(Math.random() * 127) + 127).toString(16);
      var b = (Math.round(Math.random() * 127) + 127).toString(16);
      return '#' + r + g + b;
    }
    // Utility function that gets the child that matches the classname
    // because Angular.element.children() doesn't take selectors
    // it's still better than a whole jQuery implementation
    // @param  {Array}  childrens       An array of childrens - element.children() or element.find('div')
    // @param  {String} className       Class name
    // @return {Angular.element|null}    The founded child or null
    function getChildrenByClassname(childrens, className) {
      var child = null;
      for (var i in childrens) {
        if (angular.isElement(childrens[i])) {
          child = angular.element(childrens[i]);
          if (child.hasClass(className))
            return child;
        }
      }
      return child;
    }
    // Main link function
    // @param  {[type]} scope   [description]
    // @param  {[type]} element [description]
    // @param  {[type]} attrs   [description]
    // @return {[type]}         [description]
    function link(scope, element, attrs) {
      var config = {
          title: '',
          tooltips: true,
          labels: false,
          mouseover: function () {
          },
          mouseout: function () {
          },
          click: function () {
          },
          legend: {
            display: true,
            position: 'left',
            reverse: false,
            htmlEnabled: false
          },
          colors: defaultColors,
          innerRadius: 0,
          lineLegend: 'lineEnd',
          lineCurveType: 'cardinal',
          isAnimate: true,
          yAxisTickFormat: 's'
        };
      var totalWidth = element[0].clientWidth;
      var totalHeight = element[0].clientHeight;
      if (totalHeight === 0 || totalWidth === 0) {
        // throw new Error('Please set height and width for the chart element');
        // Setting default W & H instead of throwing an error - subsequent calls will reset the dimensions
        totalHeight = 200;
        totalWidth = 200;
      }
      var data, series, points, height, width, chartContainer, legendContainer, chartType;
      // All the magic happens here
      // handles extracting chart type
      // getting data
      // validating data
      // drawing the chart
      // @return {[type]} [description]
      function init() {
        prepareData();
        setHeightWidth();
        setContainers();
        var chartFunc = getChartFunction(chartType);
        if (!!chartFunc) {
          chartFunc();
          drawLegend();
        }
      }
      // Sets height and width of chart area based on legend
      // used for setting radius, bar width of chart
      function setHeightWidth() {
        if (!config.legend.display) {
          height = totalHeight;
          width = totalWidth;
          return;
        }
        switch (config.legend.position) {
        case 'top':
        case 'bottom':
          height = totalHeight * 0.75;
          width = totalWidth;
          break;
        case 'left':
        case 'right':
          height = totalHeight;
          width = totalWidth * 0.75;
          break;
        }
      }
      // Creates appropriate DOM structure for legend + chart
      function setContainers() {
        var container = $templateCache.get('angularChartsTemplate_' + config.legend.position);
        element.html(container);
        //http://stackoverflow.com/a/17883151
        $compile(element.contents())(scope);
        //getting children divs
        var childrens = element.find('div');
        chartContainer = getChildrenByClassname(childrens, 'ac-chart');
        legendContainer = getChildrenByClassname(childrens, 'ac-legend');
        height -= getChildrenByClassname(childrens, 'ac-title')[0].clientHeight;
      }
      // Parses data from attributes
      function prepareData() {
        data = scope.acData;
        chartType = scope.acChart;
        series = data ? data.series || [] : [];
        points = data ? data.data || [] : [];
        if (!!scope.acConfig) {
          angular.extend(config, scope.acConfig);
        }
      }
      // Returns appropriate chart function to call
      function getChartFunction(type) {
        var charts = {
            'pie': pieChart,
            'bar': barChart,
            'stacked-bar': stackedBarChart,
            'line': lineChart,
            'area': areaChart,
            'point': pointChart
          };
        return charts[type];
      }
      // Filters down the x axis labels if a limit is specified
      function filterXAxis(xAxis, x) {
        var allTicks = x.domain();
        if (config.xAxisMaxTicks && allTicks.length > config.xAxisMaxTicks) {
          var mod = Math.ceil(allTicks.length / config.xAxisMaxTicks);
          xAxis.tickValues(allTicks.filter(function (e, i) {
            return i % mod === 0;
          }));
        }
      }
      /////////////////////////////////////////////////////////////////
      // BAR CHART - grouped with negative value handling            //
      /////////////////////////////////////////////////////////////////
      function barChart() {
        // TODO: Add margin to config w/ default
        var margin = {
            top: 0,
            right: 20,
            bottom: 30,
            left: config.axisLabel && config.axisLabel.y ? 60 : 40
          };
        width -= margin.left + margin.right;
        height -= margin.top + margin.bottom;
        var x = d3.scale.ordinal().rangeRoundBands([
            0,
            width
          ], 0.2);
        var y = d3.scale.linear().range([
            height,
            10
          ]);
        var x0 = d3.scale.ordinal().rangeRoundBands([
            0,
            width
          ], 0.1);
        var yData = [0];
        points.forEach(function (d) {
          d.nicedata = d.y.map(function (e, i) {
            yData.push(e);
            return {
              x: d.x,
              y: e,
              s: i,
              tooltip: angular.isArray(d.tooltip) ? d.tooltip[i] : d.tooltip,
              columnId: d.columnId
            };
          });
        });
        var yMaxPoints = d3.max(points.map(function (d) {
            return d.y.length;
          }));
        scope.yMaxData = yMaxPoints;
        x.domain(points.map(function (d) {
          return d.x;
        }));
        var padding = d3.max(yData) * 0.2;
        y.domain([
          d3.min(yData),
          d3.max(yData) + padding
        ]);
        x0.domain(d3.range(yMaxPoints)).rangeRoundBands([
          0,
          x.rangeBand()
        ]);
        // Create scales using d3
        var xAxis = d3.svg.axis().scale(x).orient('bottom');
        filterXAxis(xAxis, x);
        var yAxis = d3.svg.axis().scale(y).orient('left').ticks(10).tickFormat(d3.format('s'));
        // Start drawing the chart
        var svg = d3.select(chartContainer[0]).append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom + 50).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        // Add x-axis labels
        if (points.length > 5) {
          // TODO: make the threshold a config var
          // Rotate labels if there are many of them
          svg.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + height + ')').call(xAxis).selectAll('text').style('text-anchor', 'end').attr('dx', '-.8em').attr('dy', '1em').attr('transform', function (d) {
            return 'rotate(-25)';
          });
        } else {
          // Don't rotate labels
          svg.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + height + ')').call(xAxis).selectAll('text').attr('dy', '1.2em');
        }
        svg.append('g').attr('class', 'y axis').call(yAxis);
        if (config.axisLabel && config.axisLabel.y) {
          svg.append('text').attr('class', 'y axis-label').attr('text-anchor', 'middle').attr('transform', 'rotate(-90)').attr('y', 25).attr('x', -1 * height / 2).attr('dy', '-5em').style('font-size', '2em').text(config.axisLabel.y);
        }
        // Add bars
        var barWidth = d3.min([
            x0.rangeBand(),
            width / 3
          ]);
        var minBarHeight = config.minBarHeight ? config.minBarHeight : 0;
        var barGroups = svg.selectAll('.state').data(points).enter().append('g').attr('class', 'g').attr('transform', function (d) {
            return 'translate(' + x(d.x) + ',0)';
          });
        var bars = barGroups.selectAll('rect').data(function (d) {
            return d.nicedata;
          }).enter().append('rect').attr('class', function (d) {
            if (d.columnId)
              return 'highlightable-bar ' + d.columnId;
          });
        bars.attr('width', barWidth);
        bars.attr('x', function (d, i) {
          return x0(i);
        }).attr('y', height).style('fill', function (d) {
          return getColor(d.s);
        }).attr('height', 0).transition().ease('cubic-in-out').duration(config.isAnimate ? 1000 : 0).attr('y', function (d) {
          var ret = y(Math.max(0, d.y));
          if (y(0) - y(d.y) < minBarHeight) {
            ret = ret - minBarHeight + (y(0) - y(d.y));
          }
          return ret;
        }).attr('height', function (d) {
          return Math.max(Math.abs(y(d.y) - y(0)), minBarHeight);
        });
        // Add events for tooltip
        bars.on('mouseover', function (d) {
          makeToolTip({
            index: d.x,
            value: d.tooltip ? d.tooltip : d.y,
            series: series[d.s]
          }, d3.event);
          if (config.highlight) {
            highlightColumn(d.columnId);
          }
          config.mouseover(d, d3.event);
          scope.$apply();
        }).on('mouseleave', function (d) {
          removeToolTip();
          if (config.highlight) {
            unhighlightColumn(d.columnId);
          }
          config.mouseout(d, d3.event);
          scope.$apply();
        }).on('mousemove', function (d) {
          updateToolTip(d3.event);
        }).on('click', function (d) {
          config.click.call(d, d3.event);
          scope.$apply();
        });
        // Add bar labels [optional]
        if (config.labels) {
          barGroups.selectAll('not-a-class').data(function (d) {
            return d.nicedata;
          }).enter().append('text').attr('class', 'ac-bar-label').attr('x', function (d, i) {
            return x0(i);
          }).attr('y', function (d) {
            return height - Math.abs(y(d.y) - y(0));
          }).text(function (d) {
            return d.y;
          });
        }
        // Draw one zero line in case negative values exist
        svg.append('line').attr('x1', width).attr('y1', y(0)).attr('y2', y(0)).style('stroke', 'silver');
      }
      /////////////////////////////////////////////////////////////////
      // BAR CHART - stacked                                         //
      /////////////////////////////////////////////////////////////////
      function stackedBarChart() {
        // if(!!series && series.length === 0) {
        //   console.log('WARNING: No series defined for stacked-bar chart');
        // }
        var margin = {
            top: 0,
            right: 20,
            bottom: 30,
            left: 60
          };
        width -= margin.left + margin.right;
        height -= margin.top + margin.bottom;
        var x = d3.scale.ordinal().rangeRoundBands([
            0,
            width
          ], 0.2);
        var y = d3.scale.linear().range([
            height,
            10
          ]);
        var x0 = d3.scale.ordinal().rangeRoundBands([
            0,
            width
          ], 0.1);
        var yData = [0];
        points.forEach(function (d) {
          var y0 = 0;
          d.nicedata = d.y.map(function (e, i) {
            var ret = {
                x: d.x,
                y: e,
                y0: y0,
                y1: y0 += e,
                s: i,
                tooltip: angular.isArray(d.tooltip) ? d.tooltip[i] : d.tooltip
              };
            yData.push(y0);
            return ret;
          });
        });
        var yMaxPoints = d3.max(points.map(function (d) {
            return d.y.length;
          }));
        scope.yMaxData = yMaxPoints;
        x.domain(points.map(function (d) {
          return d.x;
        }));
        var padding = d3.max(yData) * 0.2;
        if (config.yAxis && config.yAxis.scale === 'percentage') {
          y.domain([
            0,
            100
          ]);
        } else {
          y.domain([
            d3.min(yData),
            d3.max(yData) + padding
          ]);
        }
        x0.domain(d3.range(yMaxPoints)).rangeRoundBands([
          0,
          x.rangeBand()
        ]);
        var xAxis = d3.svg.axis().scale(x).orient('bottom');
        filterXAxis(xAxis, x);
        // Prefix tick labels
        var yTickPrefix, yTickPostfix;
        if (config.yAxis && config.yAxis.tickPrefix) {
          yTickPrefix = config.yAxis.tickPrefix;
        }
        if (config.yAxis && config.yAxis.tickPostfix) {
          yTickPostfix = config.yAxis.tickPostfix;
        }
        var yAxis = d3.svg.axis().scale(y).orient('left').ticks(10).tickFormat(d3.format('' + yTickPrefix + 's' + yTickPostfix));
        // Special tick postfix for percentage scale
        if (config.yAxis && config.yAxis.scale === 'percentage') {
          yAxis.tickFormat(function (d) {
            return d + '%';
          });
        }
        // Start drawing the chart
        var svg = d3.select(chartContainer[0]).append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom + 50).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        // Add x-axis labels
        if (points.length > 5) {
          // TODO: make the threshold a config var
          // Rotate labels if there are many of them
          svg.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + height + ')').call(xAxis).selectAll('text').style('text-anchor', 'end').attr('dx', '-.8em').attr('dy', '1em').attr('transform', function (d) {
            return 'rotate(-25)';
          });
        } else {
          // Don't rotate labels
          svg.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + height + ')').call(xAxis).selectAll('text').attr('dy', '1.2em');
        }
        svg.append('g').attr('class', 'y axis').call(yAxis);
        // Y axis vertical label
        if (config.yAxis && config.yAxis.label) {
          svg.append('text').attr('transform', 'rotate(-90)').attr('y', 0 - margin.left).attr('x', 0 - height / 2).attr('dy', '1em').style('text-anchor', 'middle').attr('class', 'y-axis-label').text(config.yAxis.label);
        }
        // Add bars
        var barWidth = d3.min([
            x.rangeBand(),
            width / 3
          ]);
        var barGroups = svg.selectAll('.state').data(points).enter().append('g').attr('class', 'g').attr('transform', function (d) {
            return 'translate(' + x(d.x) + ',0)';
          });
        var bars = barGroups.selectAll('rect').data(function (d) {
            return d.nicedata;
          }).enter().append('rect');
        bars.attr('width', barWidth);
        bars.attr('x', function (d, i) {
          return x(i);
        }).attr('y', height).style('fill', function (d) {
          return getColor(d.s);
        }).attr('height', 0).transition().ease('cubic-in-out').duration(config.isAnimate ? 1000 : 0).attr('y', function (d) {
          return y(d.y1);
        }).attr('height', function (d) {
          return y(d.y0) - y(d.y1);
        });
        // Add events for tooltip
        bars.on('mouseover', function (d) {
          makeToolTip({
            index: d.x,
            value: d.tooltip ? d.tooltip : d.y,
            series: series[d.s]
          }, d3.event);
          config.mouseover(d, d3.event);
          scope.$apply();
        }).on('mouseleave', function (d) {
          removeToolTip();
          config.mouseout(d, d3.event);
          scope.$apply();
        }).on('mousemove', function (d) {
          updateToolTip(d3.event);
        }).on('click', function (d) {
          config.click.call(d, d3.event);
          scope.$apply();
        });
        // Add bar labels [optional]
        if (config.labels) {
          barGroups.selectAll('not-a-class').data(function (d) {
            return d.nicedata;
          }).enter().append('text').attr('x', function (d, i) {
            return x0(i);
          }).attr('y', function (d) {
            return height - Math.abs(y(d.y) - y(0));
          }).text(function (d) {
            return d.y;
          });
        }
        // Draw one zero line in case negative values exist
        svg.append('line').attr('x1', width).attr('y1', y(0)).attr('y2', y(0)).style('stroke', 'silver');
      }
      /////////////////////////////////////////////////////////////////
      // PIE CHART                                                   //
      /////////////////////////////////////////////////////////////////
      function pieChart() {
        var innerRadius = 0, radius = Math.min(width, height) / 2, svg = d3.select(chartContainer[0]).append('svg').attr('width', width + 100).attr('height', height + 30).append('g').attr('transform', 'scale(0.8)translate(' + (width / 2 + width * 0.2) + ',' + (height / 2 + height * 0.2) + ')');
        if (config.innerRadius) {
          var configRadius = config.innerRadius;
          if (typeof configRadius === 'string' && configRadius.indexOf('%') > 0) {
            configRadius = radius * (parseFloat(configRadius) * 0.01);
          } else {
            configRadius = Number(configRadius);
          }
          if (configRadius >= 0) {
            innerRadius = configRadius;
          }
        }
        scope.yMaxData = points.length;
        var arc = d3.svg.arc().outerRadius(radius - 10).innerRadius(innerRadius);
        var pie = d3.layout.pie().sort(null).value(function (d) {
            return d.y[0];
          });
        var path = svg.selectAll('.arc').data(pie(points)).enter().append('g');
        var complete = false;
        path.append('path').style('fill', function (d, i) {
          return getColor(i);
        }).transition().ease('linear').duration(config.isAnimate ? 500 : 0).attrTween('d', tweenPie).attr('class', 'arc').each('end', function () {
          //avoid firing multiple times
          if (!complete) {
            complete = true;
            //Add listeners when transition is done
            path.on('mouseover', function (d) {
              makeToolTip({ value: d.data.tooltip ? d.data.tooltip : d.data.y[0] }, d3.event);
              d3.select(this).select('path').transition().duration(200).style('stroke', 'white').style('stroke-width', '2px');
              config.mouseover(d, d3.event);
              scope.$apply();
            }).on('mouseleave', function (d) {
              d3.select(this).select('path').transition().duration(200).style('stroke', '').style('stroke-width', '');
              removeToolTip();
              config.mouseout(d, d3.event);
              scope.$apply();
            }).on('mousemove', function (d) {
              updateToolTip(d3.event);
            }).on('click', function (d) {
              config.click(d, d3.event);
              scope.$apply();
            });
          }
        });
        if (config.labels) {
          var outerLabelFontSize = radius > 240 ? '1.7em' : '2em';
          var innerLabelFontSize = radius > 240 ? '2em' : '2.5em';
          var totalSegmentValues = d3.sum(data.data, function (d) {
              return d.y[0];
            });
          path.append('text').attr('transform', function (d) {
            var c = arc.centroid(d), m = 2.75;
            // label distance from center
            return 'translate(' + c[0] * m + ',' + c[1] * m + ')';
          }).attr('dy', '.35em').style('text-anchor', 'middle').style('font-size', outerLabelFontSize).style('text-shadow', '1px 1px 2px rgba(50, 50, 50, 0.8)').text(function (d) {
            return d.data.x;
          });
          if (!!config.percentageInnerLabels) {
            path.append('text').attr('transform', function (d) {
              var c = arc.centroid(d), m = 1.5;
              return 'translate(' + c[0] * m + ',' + c[1] * m + ')';
            }).attr('dy', '.35em').style('text-anchor', 'middle').style('font-size', innerLabelFontSize).style('text-shadow', '1px 1px 2px rgba(50, 50, 50, 0.8)').text(function (d) {
              return d3.round(100 * d.data.y[0] / totalSegmentValues, 0) + '%';
            });
          }
        }
        function tweenPie(b) {
          b.innerRadius = 0;
          var i = d3.interpolate({
              startAngle: 0,
              endAngle: 0
            }, b);
          return function (t) {
            return arc(i(t));
          };
        }
      }
      // Draws a line chart
      function lineChart() {
        var margin = {
            top: 0,
            right: 40,
            bottom: 20,
            left: 40
          };
        width -= margin.left + margin.right;
        height -= margin.top + margin.bottom;
        var x = d3.scale.ordinal().domain(points.map(function (d) {
            return d.x;
          })).rangeRoundBands([
            0,
            width
          ]);
        var y = d3.scale.linear().range([
            height,
            10
          ]);
        var xAxis = d3.svg.axis().scale(x).orient('bottom');
        filterXAxis(xAxis, x);
        var yAxis = d3.svg.axis().scale(y).orient('left').ticks(5).tickFormat(d3.format('s'));
        var line = d3.svg.line().interpolate(config.lineCurveType).x(function (d) {
            return getX(d.x);
          }).y(function (d) {
            return y(d.y);
          });
        var yData = [0];
        var linedata = [];
        points.forEach(function (d) {
          d.y.map(function (e, i) {
            yData.push(e);
          });
        });
        var yMaxPoints = d3.max(points.map(function (d) {
            return d.y.length;
          }));
        scope.yMaxData = yMaxPoints;
        series.slice(0, yMaxPoints).forEach(function (value, index) {
          var d = {};
          d.series = value;
          d.values = points.map(function (point) {
            return point.y.map(function (e) {
              return {
                x: point.x,
                y: e,
                tooltip: point.tooltip
              };
            })[index] || {
              x: points[index].x,
              y: 0
            };
          });
          linedata.push(d);
        });
        var svg = d3.select(chartContainer[0]).append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        var padding = d3.max(yData) * 0.2;
        y.domain([
          d3.min(yData),
          d3.max(yData) + padding
        ]);
        svg.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + height + ')').call(xAxis);
        svg.append('g').attr('class', 'y axis').call(yAxis);
        var point = svg.selectAll('.points').data(linedata).enter().append('g');
        path = point.attr('points', 'points').append('path').attr('class', 'ac-line').style('stroke', function (d, i) {
          return getColor(i);
        }).attr('d', function (d) {
          return line(d.values);
        }).attr('stroke-width', '2').attr('fill', 'none');
        // Animation function
        if (linedata.length > 0) {
          var last = linedata[linedata.length - 1].values;
          if (last.length > 0) {
            var totalLength = path.node().getTotalLength() + getX(last[last.length - 1].x);
            path.attr('stroke-dasharray', totalLength + ' ' + totalLength).attr('stroke-dashoffset', totalLength).transition().duration(config.isAnimate ? 1500 : 0).ease('linear').attr('stroke-dashoffset', 0).attr('d', function (d) {
              return line(d.values);
            });
          }
        }
        // Add points
        angular.forEach(linedata, function (value, key) {
          var points = svg.selectAll('.circle').data(value.values).enter();
          points.append('circle').attr('cx', function (d) {
            return getX(d.x);
          }).attr('cy', function (d) {
            return y(d.y);
          }).attr('r', 3).style('fill', getColor(linedata.indexOf(value))).style('stroke', getColor(linedata.indexOf(value))).on('mouseover', function (series) {
            return function (d) {
              makeToolTip({
                index: d.x,
                value: d.tooltip ? d.tooltip : d.y,
                series: series
              }, d3.event);
              config.mouseover(d, d3.event);
              scope.$apply();
            };
          }(value.series)).on('mouseleave', function (d) {
            removeToolTip();
            config.mouseout(d, d3.event);
            scope.$apply();
          }).on('mousemove', function (d) {
            updateToolTip(d3.event);
          }).on('click', function (d) {
            config.click(d, d3.event);
            scope.$apply();
          });
          if (config.labels) {
            points.append('text').attr('x', function (d) {
              return getX(d.x);
            }).attr('y', function (d) {
              return y(d.y);
            }).text(function (d) {
              return d.y;
            });
          }
        });
        // Labels at the end of line
        if (config.lineLegend === 'lineEnd') {
          point.append('text').datum(function (d) {
            return {
              name: d.series,
              value: d.values[d.values.length - 1]
            };
          }).attr('transform', function (d) {
            return 'translate(' + getX(d.value.x) + ',' + y(d.value.y) + ')';
          }).attr('x', 3).text(function (d) {
            return d.name;
          });
        }
        // Returns x point of line point
        function getX(d) {
          return Math.round(x(d)) + x.rangeBand() / 2;
        }
        return linedata;
      }
      // Creates a nice area chart
      function areaChart() {
        var margin = {
            top: 0,
            right: 40,
            bottom: 20,
            left: 40
          };
        width -= margin.left + margin.right;
        height -= margin.top + margin.bottom;
        var x = d3.scale.ordinal().domain(points.map(function (d) {
            return d.x;
          })).rangePoints([
            0,
            width
          ]);
        var y = d3.scale.linear().range([
            height,
            10
          ]);
        var xAxis = d3.svg.axis().scale(x).orient('bottom');
        filterXAxis(xAxis, x);
        var yAxis = d3.svg.axis().scale(y).orient('left').ticks(5).tickFormat(d3.format('s'));
        d3.svg.line().interpolate(config.lineCurveType).x(function (d) {
          return getX(d.x);
        }).y(function (d) {
          return y(d.y);
        });
        var yData = [0];
        var linedata = [];
        points.forEach(function (d) {
          d.y.map(function (e, i) {
            yData.push(e);
          });
        });
        var yMaxPoints = d3.max(points.map(function (d) {
            return d.y.length;
          }));
        // Important to set for legend
        scope.yMaxData = yMaxPoints;
        series.slice(0, yMaxPoints).forEach(function (value, index) {
          var d = {};
          d.series = value;
          d.values = points.map(function (point) {
            return point.y.map(function (e) {
              return {
                x: point.x,
                y: e
              };
            })[index] || {
              x: points[index].x,
              y: 0
            };
          });
          linedata.push(d);
        });
        var svg = d3.select(chartContainer[0]).append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        var padding = d3.max(yData) * 0.2;
        y.domain([
          d3.min(yData),
          d3.max(yData) + padding
        ]);
        svg.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + height + ')').call(xAxis);
        svg.append('g').attr('class', 'y axis').call(yAxis);
        var point = svg.selectAll('.points').data(linedata).enter().append('g');
        var area = d3.svg.area().interpolate('basis').x(function (d) {
            return getX(d.x);
          }).y0(function (d) {
            return y(0);
          }).y1(function (d) {
            return y(0 + d.y);
          });
        point.append('path').attr('class', 'area').attr('d', function (d) {
          return area(d.values);
        }).style('fill', function (d, i) {
          return getColor(i);
        }).style('opacity', '0.7');
        function getX(d) {
          return Math.round(x(d)) + x.rangeBand() / 2;
        }
      }
      function pointChart() {
        var margin = {
            top: 0,
            right: 40,
            bottom: 20,
            left: 40
          };
        width -= margin.left - margin.right;
        height -= margin.top - margin.bottom;
        var x = d3.scale.ordinal().domain(points.map(function (d) {
            return d.x;
          })).rangeRoundBands([
            0,
            width
          ]);
        var y = d3.scale.linear().range([
            height,
            10
          ]);
        var xAxis = d3.svg.axis().scale(x).orient('bottom');
        filterXAxis(xAxis, x);
        var yAxis = d3.svg.axis().scale(y).orient('left').ticks(5).tickFormat(d3.format('s'));
        var yData = [0];
        var linedata = [];
        points.forEach(function (d) {
          d.y.map(function (e, i) {
            yData.push(e);
          });
        });
        var yMaxPoints = d3.max(points.map(function (d) {
            return d.y.length;
          }));
        scope.yMaxPoints = yMaxPoints;
        series.slice(0, yMaxPoints).forEach(function (value, index) {
          var d = {};
          d.series = value;
          d.values = points.map(function (point) {
            return point.y.map(function (e) {
              return {
                x: point.x,
                y: e
              };
            })[index] || {
              x: points[index].x,
              y: 0
            };
          });
          linedata.push(d);
        });
        var svg = d3.select(chartContainer[0]).append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        var padding = d3.max(yData) * 0.2;
        y.domain([
          d3.min(yData),
          d3.max(yData) + padding
        ]);
        svg.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + height + ')').call(xAxis);
        svg.append('g').attr('class', 'y axis').call(yAxis);
        svg.selectAll('.points').data(linedata).enter().append('g');
        // Add points
        angular.forEach(linedata, function (value, key) {
          var points = svg.selectAll('.circle').data(value.values).enter();
          points.append('circle').attr('cx', function (d) {
            return getX(d.x);
          }).attr('cy', function (d) {
            return y(d.y);
          }).attr('r', 3).style('fill', getColor(linedata.indexOf(value))).style('stroke', getColor(linedata.indexOf(value))).on('mouseover', function (series) {
            return function (d) {
              makeToolTip({
                index: d.x,
                value: d.tooltip ? d.tooltip : d.y,
                series: series
              }, d3.event);
              config.mouseover(d, d3.event);
              scope.$apply();
            };
          }(value.series)).on('mouseleave', function (d) {
            removeToolTip();
            config.mouseout(d, d3.event);
            scope.$apply();
          }).on('mousemove', function (d) {
            updateToolTip(d3.event);
          }).on('click', function (d) {
            config.click(d, d3.event);
            scope.$apply();
          });
          if (config.labels) {
            points.append('text').attr('x', function (d) {
              return getX(d.x);
            }).attr('y', function (d) {
              return y(d.y);
            }).text(function (d) {
              return d.y;
            });
          }
        });
        // Returns x point of line point
        function getX(d) {
          return Math.round(x(d)) + x.rangeBand() / 2;
        }
      }
      // Creates and displays tooltip
      function makeToolTip(data, event) {
        if (!config.tooltips || !event) {
          return;
        }
        if (typeof config.tooltips === 'function') {
          data = config.tooltips(data);
        } else {
          data = data.value;
        }
        var el = angular.element('<p class="ac-tooltip"></p>').html(data).css({
            left: event.pageX + 20 + 'px',
            top: event.pageY - 30 + 'px'
          });
        angular.element(document.querySelector('.ac-tooltip')).remove();
        angular.element(document.body).append(el);
        scope.$tooltip = el;
      }
      // Clears the tooltip from body
      function removeToolTip() {
        if (scope.$tooltip) {
          scope.$tooltip.remove();
        }
      }
      function updateToolTip(event) {
        if (!event) {
          return;
        }
        if (scope.$tooltip) {
          scope.$tooltip.css({
            left: event.pageX + 20 + 'px',
            top: event.pageY - 30 + 'px'
          });
        }
      }
      function highlightColumn(columnId) {
        var bar = angular.element('.' + columnId);
        if (bar[0]) {
          bar[0].classList.add('highlighted');
        }
        angular.element(document).find('.' + columnId).addClass('highlighted');
      }
      function unhighlightColumn(columnId) {
        var bar = angular.element('.' + columnId);
        if (bar[0]) {
          bar[0].classList.remove('highlighted');
        }
        angular.element(document).find('.' + columnId).removeClass('highlighted');
      }
      // Adds data to legend
      function drawLegend() {
        scope.legends = [];
        if (chartType === 'pie') {
          angular.forEach(points, function (value, key) {
            scope.legends.push({
              color: config.colors[key],
              title: getBindableTextForLegend(value.x)
            });
          });
        }
        if (chartType === 'bar' || chartType === 'stacked-bar' || chartType === 'area' || chartType === 'point' || chartType === 'line' && config.lineLegend === 'traditional') {
          angular.forEach(series, function (value, key) {
            scope.legends.push({
              color: config.colors[key],
              title: getBindableTextForLegend(value)
            });
          });
        }
        if (config.legend && config.legend.reverse) {
          scope.legends.reverse();
        }
      }
      var HTML_ENTITY_MAP = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          '\'': '&#39;',
          '/': '&#x2F;'
        };
      function escapeHtml(string) {
        return String(string).replace(/[&<>"'\/]/g, function (char) {
          return HTML_ENTITY_MAP[char];
        });
      }
      function getBindableTextForLegend(text) {
        return $sce.trustAsHtml(config.legend.htmlEnabled ? text : escapeHtml(text));
      }
      // Checks if index is available in color
      // else returns a random color
      // @param  {[type]} i [description]
      // @return {[type]}   [description]
      function getColor(i) {
        if (i < config.colors.length) {
          return config.colors[i];
        } else {
          var color = getRandomColor();
          config.colors.push(color);
          return color;
        }
      }
      var w = angular.element($window);
      var resizePromise = null;
      w.bind('resize', function (ev) {
        resizePromise && $timeout.cancel(resizePromise);
        resizePromise = $timeout(function () {
          totalWidth = element[0].clientWidth;
          totalHeight = element[0].clientHeight;
          init();
        }, 100);
      });
      scope.getWindowDimensions = function () {
        return {
          'h': w[0].clientHeight,
          'w': w[0].clientWidth
        };
      };
      // Watch for any of the config changing.
      scope.$watch('[acChart, acData, acConfig]', init, true);
      scope.$watch(function () {
        return {
          w: element[0].clientWidth,
          h: element[0].clientHeight
        };
      }, function (newvalue) {
        totalWidth = newvalue.w;
        totalHeight = newvalue.h;
        init();
      }, true);
    }
    return {
      restrict: 'EA',
      link: link,
      transclude: 'true',
      scope: {
        acChart: '=',
        acData: '=',
        acConfig: '='
      }
    };
  }
]);
(function () {
    // styles.min.css
    var cssText = "" +
".angular-charts-template .axis path,.angular-charts-template .axis line{fill:none;stroke:#333}.angular-charts-template .ac-title{font-weight:700;font-size:1.2em}.angular-charts-template .ac-chart{float:left;width:75%}.angular-charts-template .ac-line{fill:none;stroke-width:2px}.angular-charts-template table{float:left;max-width:25%;list-style:none;margin:0;padding:0}.angular-charts-template td[ng-bind]{display:inline-block}.angular-charts-template .ac-legend-box{border-radius:5px;height:15px;width:15px}.ac-tooltip{display:block;position:absolute;border:2px solid rgba(51,51,51,.9);background-color:rgba(22,22,22,.7);border-radius:5px;padding:5px;color:#fff}";
    // cssText end

    var styleEl = document.createElement("style");
    document.getElementsByTagName("head")[0].appendChild(styleEl);
    if (styleEl.styleSheet) {
        if (!styleEl.styleSheet.disabled) {
            styleEl.styleSheet.cssText = cssText;
        }
    } else {
        try {
            styleEl.innerHTML = cssText
        } catch(e) {
            styleEl.innerText = cssText;
        }
    }
}());

angular.module('angularChartsTemplates', ['angularChartsTemplate_left', 'angularChartsTemplate_right']);

angular.module("angularChartsTemplate_left", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("angularChartsTemplate_left",
    "<div class=\"angular-charts-template\"><div class=\"ac-title\">{{acConfig.title}}</div><div class=\"ac-legend\" ng-show=\"{{acConfig.legend.display}}\"><table><tr ng-repeat=\"l in legends\"><td><div class=\"ac-legend-box\" ng-attr-style=\"background:{{l.color}};\"></div></td><td ng-bind-html=\"l.title\"></td></tr></table></div><div class=\"ac-chart\"></div></div>");
}]);

angular.module("angularChartsTemplate_right", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("angularChartsTemplate_right",
    "<div class=\"angular-charts-template\"><div class=\"ac-title\">{{acConfig.title}}</div><div class=\"ac-chart\"></div><div class=\"ac-legend\" ng-show=\"{{acConfig.legend.display}}\"><table><tr ng-repeat=\"l in legends | limitTo:yMaxData\"><td><div class=\"ac-legend-box\" ng-attr-style=\"background:{{l.color}};\"></div></td><td ng-bind-html=\"l.title\"></td></tr></table></div></div>");
}]);
