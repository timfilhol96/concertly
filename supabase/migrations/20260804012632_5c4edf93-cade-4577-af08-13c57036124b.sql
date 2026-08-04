
REVOKE EXECUTE ON FUNCTION public.find_profile_by_username(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_friend_link(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM anon;
