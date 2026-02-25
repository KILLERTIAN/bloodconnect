import { query, getDB } from './lib/database.ts';
import { updateEvent, getEventById } from './lib/events.service.ts';

async function test() {
    // Need to initialize sqlite properly if I can.
    console.log("Too hard to run expo-sqlite in node script without full runtime.");
}
test();
