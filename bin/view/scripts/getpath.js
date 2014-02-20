(function(){
    $('.input-find-page').on('keypress', function(event){
        if ( event.which == 13 ) {
            event.preventDefault();

            get_path(this.value);
        }
    });

    function get_path(page){
        pf.get_('path', pf.site, page)
            .done(function(resp){
                var pages = [],
                    pageNodes = [],
                    links = [],
                    l = resp.length,
                    weighs = [],
                    maxWeight;
                console.log(resp)
                resp.forEach(function(curr, i){
                    pages.push(curr[0]);
                    console.log(curr)
                    pageNodes.push({
                        name: curr[0]
                    });
                    if(i !== l-1) {
                        links.push({
                            source: i,
                            target: i+1,
                            weight: curr[1]
                        });
                    }
                    curr[1] && weighs.push(curr[1]);
                });

                maxWeight = Math.max.apply(Math.max, weighs);

                links.forEach(function(link){
                    link.weight = Math.max(1, Math.ceil((link.weight/maxWeight)*10))
                });

                var template = '{{#pages}}<li>{{.}}</li>{{/pages}}';

                $(".path-result").html(Mustache.render(template, {pages: pages}));

                create_path(pageNodes, links)
            })
    }

    $(".path-result").on('click', 'li', function(event){
        $('.nav a[href="#most-visited"]').tab('show');
        $('.input-most-page').val(this.innerHTML);

        pf.get_most_visited(this.innerHTML)
    });

    $('.nav a[href=#paths]').on('shown', function(){
        if(pf.site && pf.page) {
            get_path(pf.page);
        }
    });

    function create_path(pages, links){
       $('#paths svg').remove();

        pf.getD3(pages, links, '#paths', true);
    }
})();