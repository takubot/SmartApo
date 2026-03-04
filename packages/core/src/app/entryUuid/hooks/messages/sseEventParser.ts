export type ParsedSseEvent = {
  eventType: string;
  eventData: string;
};

export const parseSseChunk = (previousBuffer: string, incomingText: string) => {
  const nextBuffer = `${previousBuffer}${incomingText}`;
  const rawEvents = nextBuffer.split("\n\n");
  const restBuffer = rawEvents.pop() || "";
  const parsedEvents: ParsedSseEvent[] = [];

  for (const eventStr of rawEvents) {
    if (!eventStr.trim()) continue;
    const lines = eventStr.split("\n");
    let eventType = "";
    const dataLines: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, "");
      if (line.startsWith("event:")) {
        eventType = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trim());
      }
    }

    const eventData = dataLines.join("");
    if (!eventType || !eventData) continue;
    parsedEvents.push({ eventType, eventData });
  }

  return {
    restBuffer,
    parsedEvents,
  };
};
