(function(){
    pf.get_most_visited = function (page) {
        pf.get_('most_visited', pf.site, page).done(function(resp){
            var template = "<thead><th>Page</th><th>Count</th></thead><tbody>{{#result}}<tr>{{#.}}<td>{{.}}</td>{{/.}}</tr>{{/result}}</tbody>"

            $('.most-visited-result').html(Mustache.render(template, {result: resp}));

            var pages = [{name: page}],
                links = [];

            resp.forEach(function(page, i){
                pages.push({
                    name: page[0]
                });

                links.push({
                    source: 0,
                    target: i+1,
                    weight: page[1]
                })
            });

            create_most_visited(pages, links)
        });
    };

    $('.nav a[href=#most-visited]').on('shown', function(){
        if(pf.site && pf.page) {
            pf.get_most_visited(pf.page);
        }
    });

    $('.input-most-page').on('keypress', function(){
        if ( event.which == 13 ) {
            event.preventDefault();

            pf.get_most_visited(this.value);
        }
    });

    $('.most-visited-result').on('click', 'tr', function(){
        var page = $(this).find('td:first-of-type').text();

        $('.input-most-page').val(page);

        pf.get_most_visited(page)
    });

    function create_most_visited(pages, links){
        $('#most-visited svg').remove();

        pf.getD3(pages, links, '#most-visited', true);
    }
})();