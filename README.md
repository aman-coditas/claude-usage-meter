# usage-meter

A Claude Desktop mod that adds a slim ribbon just above the prompt box showing:

- **Session (5h)** and **Weekly (7d)** usage as a row of ten small squares (one per 10%), coloured green to red by how full the window is. The last lit square pulses once usage passes 70%.
- **Prompt cache** temperature: HOT (last turn under a minute ago), WARM (under 5 minutes) or COLD, with a pulsing dot. This is estimated from the time since your last turn, assuming a 5-minute cache lifetime.

Usage figures come from the rate-limit windows the app reports after each response, so they appear only on accounts that report them, and may lag the app's own usage page by a point.

## Install

At the prompt of a terminal session:

```
/plugin install usage-meter --marketplace aman-coditas/claude-usage-meter
```

or from a shell:

```
claude plugin install usage-meter --marketplace aman-coditas/claude-usage-meter
```

In the desktop app, click + next to the prompt box, then Plugins, Add marketplace with `aman-coditas/claude-usage-meter`, then Add plugin.

## License

MIT
