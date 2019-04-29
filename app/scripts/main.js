var eideticManifold = function(authorData) {
  var width = window.innerWidth,
      height = window.innerHeight,
      rotate = 60,        // so that [-60, 0] becomes initial center of projection
      maxlat = 83,        // clip northern and southern poles (infinite in mercator)
      margin = {top: 10, right: 10, bottom: 10, left: 10},
      Data,
      mode = 'timeline', // Can be ['timeline','author','book', refGraph],
      focusedObject = 'someID',
      selected ='Aeschylus';

  var svg = d3.select(".eideticManifold").append("svg")
        .attr('class', 'eideticManifoldSvg')
        .attr("preserveAspectRatio", "xMidYMid")
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("width", width)
        .attr("height", width * height / width);


  var g = svg.append("g");

  var x = d3.scale.linear().range([0, width]);
  var y = d3.scale.linear().range([0, height]);
  var dates = Array.prototype.concat.apply([], authorData.map(function(d) {
    return [d.birth, d.death];
  }));
  var brush = d3.svg.brush()
        .x(x);
  var zoom = d3.behavior.zoom()
        .on("zoom", throttle(draw, 50));

  x.domain([d3.min(dates)-50, d3.max(dates) +50]);
  zoom.x(x); // must set after the domain is set for the axis.

  var xAxis = d3.svg.axis()
        .scale(x)
        .orient("top")
        .innerTickSize(-width)
        .outerTickSize(0);

  var timelineHeaderAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .innerTickSize(-width)
        .outerTickSize(0)
        .tickPadding(5)
        .tickFormat(function(d,i){
          if (d < 0) {
            return -d + " B.C.";
          }
          return d + " A.D.";
        });

  function draw() {
    d3.select(".x.axis")
      .call(xAxis);
    d3.select('.timelineHeaderSvg g')
      .call(timelineHeaderAxis);
    plotAuthors(authorData);
  }

  authorData.sort(
    function(a,b) { return a.birth - b.birth;}
  );
  plotAuthors(authorData);
  initialiseTimeLine(authorData);

  d3.select('#focusThePhilosopher').on('click', selectNext);

  function selectNext() {
    selected = authorData[authorData.indexOf(authorData.filter(function(author) {
      return author.name === selected;
    })[0]) + 1].name;

    console.log(selected);

    d3.selectAll('.author')
      .data(authorData)
      .filter(function(d){
        return d.name === selected;
      })
      .each(function(d) {
        d3.transition().duration(750).tween("zoom", function() {
          var ix = d3.interpolate(x.domain(), [d.birth -10, d.death +10]);
          return function(t) {
            zoom.x(x.domain(ix(t)));
            draw();
          };
        });
      });
  }

  // use as function so we can refresh points on command
  function plotAuthors(authorData) {
    console.log(authorData);

    var authorIndex = authorData.reduce(function(authorMap, nextAuthor) {
      authorMap[nextAuthor.id] = nextAuthor;
      return authorMap;
    }, {});

    // DATA JOIN
    var authorsGroup = d3.selectAll('.eideticManifold').selectAll(".author") // add circles to new g element
          .data(authorData, function(d) { return d.name; })
          .style('left', function(d,i) {
            return x(d.birth) + "px";
          })
          .style('top', function(d,i) {
            return 20 + i%14*35 + 18 + "px";
          })
          .style('width', function(d) {
            return x(d.death) - x(d.birth) + 'px';
          });

    d3.selectAll('.eideticManifold').call(zoom);

    // ENTER NEW NODES
    var author = authorsGroup.enter()
          .append("div")
          .attr('class', 'author')
          .style('left', function(d,i) {
            return x(d.birth) + "px";
          })
          .style('top', function(d,i) {
            return 20 + i%14*35 + 18 + "px";
          })
          .style('width', function(d) {
            return x(d.death) - x(d.birth) + 'px';
          });

    var authorName = author
          .append('h2')
          .attr('class', 'authorName')
          .text(function(d){return d.name;});

    var authorLifespan = author.append('div')
          .attr('class', 'authorLifespan')
          .style('height', '8px');

    var authorBooksContainer = author
          .append('div')
          .attr('class', 'booksContainer');

    var authorBooks = authorBooksContainer.selectAll('.bookCover')
          .data(function(d) { return d.books; })
          .enter()
          .append('img')
          .attr('class', 'bookCover')
          .attr('src', function(book, i) {
            console.log(book);
            return book.cover_url;
          })
          .style('left', function(d, i) {
            console.log(d);
            var author = authorIndex[d.authors[0].id];
            if (author) {
              console.log(authorIndex);
              console.log(d.authors[0]);
              console.log(d.authors[0].id);
              var interval = 100*(author.lifeSpan/author.books.length)/author.lifeSpan;
              return interval*i + '%';
            }
          });
  }

  window.addEventListener('resize', function(event){
    var w = window.innerWidth;
    svg.attr("width", w);
    svg.attr("height", w * height / width);
  });

  function initialiseTimeLine(data) {

    g.append('g')
      .attr('class', 'x axis')
      .attr('id', 'xAxisMain')
      .call(xAxis);

    var timelineHeader = d3.select('.timelineHeader')
          .append('svg:svg')
          .attr('class', 'timelineHeaderSvg')
          .append('g')
          .call(timelineHeaderAxis);

  }
};

d3.json('https://api.archivelab.org/classics/authors', function(json) {
  function yearStringToNumber(d) {
    var number = d.split(' ')[0];
    if (d.includes('~')) {
      number = parseInt(number.split('~')[1]);
      return d.includes('B') ? -number : number;
    }
    return d.includes('B') ? -parseInt(number) : parseInt(number);
  }

  var authorData = json.authors.map(function(author) {
    if (author.years && author.books) {
      author.birth = yearStringToNumber(author.years[0]);
      author.birthApproximate = author.years[0].includes('~');
      if (author.years[1]) {
        author.death = yearStringToNumber(author.years[1]);
        author.deathApproximate = author.years[1].includes('~');
        author.lifeSpan = Math.abs(author.death - author.birth);
      } else {
        author.death = author.birth + 80;
        author.deathApproximate = true;
        author.lifeSpan = 80;
      }
      return author;
    }
    return false;
  }).filter(function(author){ var defined = author?true:false; return defined; });

  eideticManifold(authorData);
});

var _now = Date.now || function() {
  return new Date().getTime();
};
var throttle = function(func, wait, options) {
  var context, args, result;
  var timeout = null;
  var previous = 0;
  if (!options) options = {};
  var later = function() {
    previous = options.leading === false ? 0 : _now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };
  return function() {
    var now = _now();
    if (!previous && options.leading === false) previous = now;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
};

