(function(){
    var pathId = 0;

    $('.nav a[href=#graph]').on('shown', function(){
        if(pf.site && pf.page) {
            getGraph(pf.page, create_graph, 0);
        }
    });

    $('.input-graph').on('keypress', function(){
        if ( event.which == 13 ) {

            event.preventDefault();

            getGraph(this.value, create_graph, 0);
        }
    });

    function getGraph(page, callback, id, pages, links) {
        pf.get_('all_paths', pf.site, encodeURIComponent(page)).done(function(resp){

            var weights = [];

            pages = pages || [];
            links = links || [];


            //for adding graph first will be the same as it was
            if(id > 0) {
                resp = resp.slice(1);
            }

            resp.forEach(function(path){
                pathId++;

                path.forEach(function(curr, i, array){
                    var next = array[i+1],
                        currIndex = contain(pages, curr[0]),
                        nextIndex = next && contain(pages, next[0]);

                    if(currIndex < 0){
                        pages.push({
                            name: curr[0],
                            pathIds: [pathId],
                            loaded: currIndex === id
                        });

                    }else {
                        pages[currIndex].loaded = true;
                        pages[currIndex].pathIds.push(pathId);
                    }

                    var source = (id || i) && (currIndex >= 0 ? currIndex : pages.length-1),
                        target = (nextIndex >= 0 ? nextIndex : pages.length);

                    if(next && !linkExist(links, source, target)) {
                        links.push({
                            source: source,
                            target: target,
                            weight: curr[1],
                            pathIds: [pathId]
                        });

                        curr[1] && weights.push(curr[1]);
                    }
                });

            });

            callback(pages, links);
        });
    }

    function linkExist(links, src, trg) {
        var index = -1;

        links.some(function(lnk, i){
            var source,
                target;

            if(isFinite(lnk.source)) {
                source = lnk.source;
            } else {
                source = lnk.source.index;
            }

            if(isFinite(lnk.target)) {
                target = lnk.target;
            } else {
                target = lnk.target.index;
            }

            if(source === src && target === trg){
                lnk.pathIds.push(pathId);
                index = i;
                return true;
            }
        });

        return index > -1;
    }

    function contain(pages, page) {
        var index = -1;

        pages.some(function(pag, i){
            if(pag.name === page){
                index = i;
                return true;
            }
        });

        return index;
    }

    function create_graph(pages, links){
        $('#graph svg').remove();


        pf.getD3(pages, links, '#graph', false, function(elem, d3Elem, callback, id, pages, links){
            if(!d3Elem.loaded) {

                getGraph(d3Elem.name, function(pages, links){
                    callback(pages, links)
                }, id, pages, links );
            }

        });
    }

})();