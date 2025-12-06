This AWS lambda with API gateway in front of it, accepts messages from a Slack channel if that channel is 
configured to send them to it.

Then, it extracts the text of the post, prepends it with instructions and forwards to Bedrock which this project
also stands up.

Finally, the lambda returns the LLM's response.

All AWS services are stood up using terraform from this project.

Test calls:

Rejection:
curl -s -X POST "https://byi3f6zx6b.execute-api.us-west-2.amazonaws.com/" \
    -H "Content-Type: application/json" \
    -d '{"token":"hQPfkXZFociZ4vA4umlPiEDl","team_id":"T1J2G3TL0","context_team_id":"T1J2G3TL0","context_enterprise_id":null,"api_app_id":"A09V962SZFV","eve
nt": {"type":"message","user":"U1J2A677W","ts":"1764786705.603199","client_msg_id":"65418ded-fc07-4fca-90d3-0a34ddfaf576","text":"This is message text","tea
m":"T1J2G3TL0","channel":"C09V8G17AUB","event_ts":"1764786705.603199","channel_type":"group"}}'

Acceptance:
curl -s -X POST "https://byi3f6zx6b.execute-api.us-west-2.amazonaws.com/"     -H "Content-Type: application/json"     -d '{"token":"hQPfkXZFociZ4vA4umlPiEDl","team_id":"T1J2G3TL0","context_team_id":"T1J2G3TL0","context_enterprise_id":null,"api_app_id":"A09V962SZFV","event": {"type":"message","user":"U1J2A677W","ts":"1764786705.603199","client_msg_id":"65418ded-fc07-4fca-90d3-0a34ddfaf576","text":"Though shall not steal!","team":"T1J2G3TL0","channel":"C09V8G17A
UB","event_ts":"1764786705.603199","channel_type":"group"}}'