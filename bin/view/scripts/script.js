(function(context){
    var pf = {
            site: localStorage['site'] || '',
            page:localStorage['page'] || '',
            get_: function(){
                return $.getJSON(window.location.origin + '/api/get_' + [].slice.call(arguments).join('/'))
            }
        },
        siteInput = $('.input-find-site');

    var hash = context.location.hash.split('/');

    if(hash[1]) {
        pf.site = hash[1];
    }

    if(hash[2]) {
        pf.page = hash[2];
    }

    $(function(){
        $('.nav a[href=' + hash[0] + ']').tab('show');
    });

    siteInput.typeahead({
        source: function(query, process){
            var elem = this;
            elem.source = [];

            pf.get_('sites').done(function(resp){
                elem.source = resp
            });
        }
    }).on('blur', function(){
        pf.site = this.value
        localStorage['site'] = pf.site;
    }).parent().on('submit', function(ev){
        ev.preventDefault();
    }).val(pf.site);

    $('.navbar a').click(function(e) {
        $(this).tab('show');
    });

    var cache = {};

    $('.input-page').typeahead({
        source: function(query, process){
            var site = pf.site;

            if ( site !== '' ) {
                if(cache[site] && cache[site][query]) {
                    return cache[site][query];
                }else{
                    pf.get_('pages', site, query)
                        .done(function(resp){
                            if(!cache[site]) cache[site] = {}
                            cache[site][query] = resp;
                            process(resp);
                        });
                }
            } else {
                siteInput.popover({
                    content: 'This can not be empty',
                    placement: 'bottom',
                    title: 'Select site'
                }).popover('show')
            }
        },
        limit: 10,
        minLength: 2
    })
        .val(pf.page)
        .on('blur keyup', function(){
            pf.page = this.value
            localStorage['page'] = pf.page;
        });

        $('#perma-link').on('click', function(ev){
            ev.preventDefault();

            var hash = context.location.hash || '';

            if(hash.indexOf('/') > -1) {
                hash = hash.split('/')[0]
            }

            context.location.hash = hash + '/' + pf.site + '/' + pf.page;

        });

    pf.getD3 = function(pages, links, selector, number, onMeta){
        var width = 1150,
            height = 800,
            linkColor = "#da2a55",
            nodeColor = "#DCE9BE",
            force = d3.layout.force()
                .size([width, height])
                .charge(-20)
                .gravity(0)
                //.friction(.9)
                .linkDistance(function(d){
                    return 400 - ~~Math.max(100, Math.min(~~(d.weight*10), 300));
                })
                .linkStrength(function(d){
                    return ~~Math.max(10, Math.min(~~(d.weight/10), 20));
                })
                .on("tick", tick),
            drag = force.drag().on("dragstart", dragstart).on('dragend', dragend),
            zoom = d3.behavior.zoom()
                .translate([0, 0])
                .scale(1)
                .scaleExtent([.1, 15]),
            svg = d3.select(selector).append("svg")
                .attr("width", width)
                .attr("height", height),
            link,
            circles,
            page;

        // define arrow markers for graph links
        var arrow = svg.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('markerWidth', 7)
            .attr('markerHeight', 7)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', linkColor);

        zoom.on("zoom", zoomed)

        var vis = svg.append("g")
            .call(zoom)
            .on("dblclick.zoom", null);

        vis.append("rect")
           .attr("class", "overlay")
           .attr("width", width)
           .attr("height", height);

        vis = svg.append('g');

        addElements(pages, links);

        var dashOffset = 99999999;

        function tick(ev) {

            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            page.attr("x", function(d) { return d.x - 8; })
                .attr("y", function(d) { return d.y + 4; });

            circles.attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; })
                .attr("r", function(d) { return d.r || 5; });
        }

        function addElements(pages, links){
            vis.selectAll(".link").data(links)
                .enter().append("line")
                .attr("class", "link")
                .attr('stroke', linkColor)
                .classed('selectedPath', false)
//                .style('stroke-width', '2px')
                .style('stroke-width', function(d){
                    return ~~Math.max(1, Math.min(3, ~~(d.weight/10))) + 'px';
                })
                .on('mouseenter', function(d, evs, ev){
                    if(d3.event.altKey && d.pathIds) {
                        //TODO: Figure out way to choose path
                        var pathId = d.pathIds[0];

                        link.classed('selectedPath', function(d) {
                            if(d.pathIds.indexOf(pathId) > -1){
                               // d3.select(this).style('stroke-width', '5px');
                                d.selected = true;
                                return true;
                            }else{
                                //d3.select(this).style('stroke-width', '2px');
                                d.selected = false;
                                return false;
                            }
                        });

                        circles.classed('selectedPath', function(d) {
                            if(d.pathIds.indexOf(pathId) > -1) {
                                d.selected = true;
                                d.r = 20;
                                return true;
                            }else{
                                d.r = 5;
                                d.selected = false;
                                return false
                            }

                        });

                        link.sort(function(a,b){
                            return a.selectedPath;
                        })
                    }

                    tick();
                })
                .on("dblclick.zoom", null);

            vis.selectAll('.circle').data(pages)
                .enter()
                .append('circle')
                .attr('class', 'circle')
                .attr('r', 5)
                .style('fill', nodeColor)
                .style('stroke', linkColor)
                .on("dblclick.zoom", null);

            vis.selectAll(".page").data(pages)
                .enter().append("text").text(function(d, i){
                    var label = d.name

                    if (number) {
                        label = '#' + i + ' ' + label;
                    }

                    return label;
                })
                .attr("class", "page")
                .attr("width", 300)
                .attr("height", 100)
                .call(drag);

            link = vis.selectAll(".link");
            page = vis.selectAll(".page");
            circles = vis.selectAll(".circle");

            vis.order();

            pages[0].fixed = 1;
            pages[0].x = width/2;
            pages[0].y = height/2;
        }

        d3.timer(function(){
            dashOffset -= 10;

            link.filter(function(d){
                return d.selected;
            })
            .attr('stroke-dashoffset', function(){
                return dashOffset;
            });

            circles.filter(function(d){
                return d.selected;
            })
            .attr('stroke-dashoffset', function(){
                return dashOffset;
            });
        });

        var lastT = [0,0],
            lastS = 1;

        function dragstart(d) {
            vis.call(zoom.on("zoom", null));

            if(d3.event.sourceEvent.altKey){

                onMeta && onMeta(this, d, function(pages, links){

                    addElements(pages, links);

                    force.start();

                }, d.index, pages, links);
            }else{
                d.fixed = this.classList.toggle('fixed');
            }
        }

        function dragend(d) {
            vis.call(zoom.scale(lastS).translate(lastT).on("zoom", zoomed));
        }

        function zoomed() {
           lastT = d3.event.translate;
           lastS = d3.event.scale;

           vis.attr("transform", "translate(" + lastT + ")" + " scale(" + lastS + ")");
        }

        force
            .nodes(pages)
            .links(links)
            .start();
    };

    context.pf = pf;

})(this);