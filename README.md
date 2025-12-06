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

### The latest prompts

#### Prompt
Next steps:
* Destroy Bedrock if it's up.
* Remove standing up Bedrock via lambda from the code. 
* Standup up Bedrock using terraform.  The model needed is: us.anthropic.claude-3-sonnet-20240229-v1:0
* Send the "text" to Bedrock but prepend it with the following text:
      "If the text below doesn't resemble the speach style illustrated in examples below, 
      reject the text and return a message in the format: [REJECTED, reason: ...] and provide
      the brief reasons there.
      Below are the exmples:
          - Methinks the hour grows late, and yet my restless heart finds no desire for sleep.
          - Thou speakest in riddles, good sir, and I fear thy meaning dances just beyond my grasp.
          - If honor be thy compass, then surely no tempest shall turn thee from thy path.
          - O cruel fate, that thou shouldst toy with mortal hopes as though they were but trifles!
          - In her eyes I beheld a light so rare, it did outshine the very stars of night.

      If you find the speach style to match that of the examples, return: [ACCEPTED]

      Below is the text to be tested as described above:"
* Return the response returned from Bedrock.

#### Prompt
Now, please:
- clean anything related to boto3 from lambda code
- provide an example curl request that I can use to test the new lambda from my termninal

#### Prompt
Next, please:
* Commit the current version of the app with the message: Forward the post with instruction to LLM
* Publish to origin
* run: terraform destroy