PathFinder
==========

Create paths out of most visited links

This is a working in progress project

This was created as my master thesis and needs some polishing but main part does work and I was able to find some paths between pages.

# How does it work ?

So for one of our wikis (wowiki) thats how (part of the) table is looking:


```table
+--------------+-----------------------------------------+--------+-------+-------------+
| article_from | article_to                              | id_to  | count | last_update |
+--------------+-----------------------------------------+--------+-------+-------------+
| A'dal        | Naaru                                   | 36257  |    40 | 2014-01-19  |
| A'dal        | Onyxien                                 | 122693 |     2 | 2014-01-19  |
| A'dal        | Illidan_Stormrage                       | 14301  |     2 | 2014-01-19  |
| A'dal        | Lady_Liadrin                            | 46068  |     4 | 2014-01-19  |
+--------------+-----------------------------------------+--------+-------+-------------+
```
Having table like that we can sort it and find most used link from A'dal page
in this case it would be Narru
then do the same thing for Narru

and so on for as long as you can find next step

This logic is simple as 'budowa cepa' (piss-easy) but do provide me with nice results
