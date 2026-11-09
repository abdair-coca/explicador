// Mechanism (d): stream clicks to the plugin monitor process (click-feed.ts), which prints them for Claude.
import type { ServerResponse } from 'node:http';
import { describeClick, type Click } from '../click.ts';
import { logEvent } from '../log.ts';

export class ClickFeed {
  private readonly subscribers = new Set<ServerResponse>();

  get size(): number {
    return this.subscribers.size;
  }

  subscribe(res: ServerResponse): void {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    res.write(': connected\n\n');
    this.subscribers.add(res);
    res.on('close', () => this.subscribers.delete(res));
    logEvent('feed_subscribed', { subscribers: this.subscribers.size });
  }

  push(click: Click): string {
    for (const res of this.subscribers) res.write(`data: ${describeClick(click)}\n\n`);
    logEvent('feed_sent', { node: click.node, subscribers: this.subscribers.size });
    return this.subscribers.size > 0 ? `sent to ${this.subscribers.size} monitor(s)` : 'no monitor connected';
  }
}
