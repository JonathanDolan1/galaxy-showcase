# Galaxy walkthrough · support roles

On my portfolio there’s a map called Jonathan’s Galaxy. It shows the personal automation system I run at home. There’s an always-on Linux server and an agent called Igor that builds my morning brief, takes voice notes and queues coding jobs.

The part I’d show in a support interview is how I know it’s working. Every open task goes on a board with a status, a priority and a next step, like a support queue. A scheduled job once skipped three days, so I built a watcher that checks whether each job actually produced fresh results. When something fails, I start with the logs. AI can search the logs; the only actions it can take are sending me one alert and logging a job check-in.

Some scheduled jobs still depend on my laptop being awake, so I’m moving them to the always-on server. The map is a dated snapshot of what’s working and what I’m still building. I’d be happy to walk you through something that broke and how I found it.

I built this page myself.

[Here’s the code.](<https://github.com/JonathanDolan1/galaxy-showcase>)
