import { describeWalkStep, formatRemainingClock, walkingSecondsFromMeters } from "@/lib/walkCopy";
import { remainingAlongPath } from "@/lib/routeProgress";
import { test } from "node:test";
import assert from "node:assert/strict";

test("turn instructions stay in plain English", () => {
  assert.equal(
    describeWalkStep({ type: "turn", modifier: "left", name: "Pall Mall" }),
    "Turn left onto Pall Mall"
  );
  assert.equal(describeWalkStep({ type: "depart", name: "Edward Street" }), "Start walking along Edward Street");
  assert.equal(describeWalkStep({ type: "arrive" }), "You have arrived");
});

test("remaining clock pads seconds", () => {
  assert.equal(formatRemainingClock(0), "0:00");
  assert.equal(formatRemainingClock(62), "1:02");
  assert.equal(formatRemainingClock(6 * 60 + 4.4), "6:04");
});

test("remaining path drops the walked section", () => {
  const path = [
    { lat: -36.38, lng: 145.4 },
    { lat: -36.381, lng: 145.4 },
    { lat: -36.382, lng: 145.4 }
  ];
  const here = { lat: -36.381, lng: 145.4 };
  const remaining = remainingAlongPath(path, here);
  assert.ok(remaining.remainingMeters < 200);
  assert.ok(remaining.remainingPath.length >= 2);
  assert.ok(remaining.offPathMeters < 20);
});

test("walking seconds match 4.8 km/h", () => {
  const seconds = walkingSecondsFromMeters(4800);
  assert.equal(Math.round(seconds), 3600);
});
