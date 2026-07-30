-- Rànquing global com a vista materialitzada (no duplica la veritat, que és a match_participants).
-- Refresca-la periòdicament: REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_global;
create materialized view if not exists leaderboard_global as
select mp.user_id,
       p.display_name,
       sum(mp.score)::bigint as total_score
from match_participants mp
join profiles p on p.id = mp.user_id
group by mp.user_id, p.display_name;

create unique index if not exists leaderboard_global_user_idx on leaderboard_global (user_id);

-- Setmanal: afegir join a matches i filtrar per ended_at dins la setmana.
