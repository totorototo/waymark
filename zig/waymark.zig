//! waymark: the WebAssembly boundary. JavaScript hands over the raw bytes of a GPX file and
//! gets JSON, or a GPX file, back. All the work lives in gpxz, reading and writing alike:
//!
//! - `routeGeometry`: the track to draw, and where each waypoint of the file sits on it.
//! - `snapCandidates`: where a click on the map lands on the track.
//! - `pointAtDistance`: the place a distance along the route names (a checkpoint by km).
//! - `summarizeEdit`: the sections, stages and per-checkpoint ETAs gpxz builds from the pins,
//!   so an edit shows its effect before the file is exported.
//! - `exportGpx`: the file with its waypoints replaced by the pins.
//!
//! JSON rather than Zig structs crosses the boundary on purpose: the reports and the pins are
//! trees of optional fields and slices, which Zigar would expose as proxies over WASM memory
//! that the caller must free. A JSON string is copied out once, and the worker posts a plain
//! object.

const std = @import("std");
const builtin = @import("builtin");
const assert = std.debug.assert;
const gpxz = @import("gpxz");

/// Scratch memory for parsing. The allocator Zigar passes in is only used for the returned
/// JSON, so JavaScript owns exactly one allocation per call.
const scratch_allocator = if (builtin.target.cpu.arch.isWasm())
    std.heap.wasm_allocator
else
    std.heap.smp_allocator;

/// The pace settings, as JavaScript passes them. Missing fields take gpxz's defaults.
pub const PlanSettings = struct {
    pace_base_s_per_km: f64 = 500,
    fatigue_coefficient: f64 = 0.002,
    life_base_stop_s: u32 = 3600,

    fn to_gpxz(self: PlanSettings) gpxz.Settings {
        return .{
            .pace_base_s_per_km = self.pace_base_s_per_km,
            .fatigue_coefficient = self.fatigue_coefficient,
            .life_base_stop_s = self.life_base_stop_s,
        };
    }
};

/// The most passes a click can offer. An out-and-back route passes a place twice, a figure
/// of eight three times; more than this is a click on a tangle the person must zoom into.
pub const candidates_max: u32 = 8;

/// A click farther than this from the track is not a click on the track.
pub const radius_m_max: f64 = 5000;

// ── Exports (camelCase: these names are the JavaScript API) ──────────────────────────────

/// The track and the waypoints' places on it, as JSON.
pub fn routeGeometry(allocator: std.mem.Allocator, gpx_bytes: []const u8) ![]u8 {
    return geometry_json(scratch_allocator, allocator, gpx_bytes);
}

/// Where a click at `latitude`, `longitude` lands on the track, as JSON: one candidate per
/// pass of the track within `radius_m`, in route order, at most `candidates_max`.
pub fn snapCandidates(
    allocator: std.mem.Allocator,
    gpx_bytes: []const u8,
    latitude: f64,
    longitude: f64,
    radius_m: f64,
) ![]u8 {
    return snap_json(scratch_allocator, allocator, gpx_bytes, latitude, longitude, radius_m);
}

/// The place `distance_m` along the track, as JSON: a candidate, as `snapCandidates` reports
/// them, with an `offset_m` of zero.
pub fn pointAtDistance(
    allocator: std.mem.Allocator,
    gpx_bytes: []const u8,
    distance_m: f64,
) ![]u8 {
    return point_json(scratch_allocator, allocator, gpx_bytes, distance_m);
}

/// The plan gpxz builds from `gpx_bytes` with its waypoints replaced by `pins_json`, as JSON.
/// `pins_json` is an array of pins, in route order (see `Pin`).
pub fn summarizeEdit(
    allocator: std.mem.Allocator,
    gpx_bytes: []const u8,
    pins_json: []const u8,
    settings: PlanSettings,
) ![]u8 {
    const edited = try edited_bytes(scratch_allocator, scratch_allocator, gpx_bytes, pins_json);
    defer scratch_allocator.free(edited);
    return plan_json(scratch_allocator, allocator, edited, settings);
}

/// `gpx_bytes` with its waypoints replaced by `pins_json`: the file to save.
pub fn exportGpx(
    allocator: std.mem.Allocator,
    gpx_bytes: []const u8,
    pins_json: []const u8,
) ![]u8 {
    return edited_bytes(scratch_allocator, allocator, gpx_bytes, pins_json);
}

// ── Implementation (snake_case, testable with any pair of allocators) ────────────────────

const default_settings: gpxz.Settings = .{};

/// A waypoint of the file, with where gpxz places it on the track.
const WaypointReport = struct {
    latitude: f64,
    longitude: f64,
    elevation_m: ?f64,
    name: []const u8,
    description: ?[]const u8,
    comment: ?[]const u8,
    symbol: ?[]const u8,
    type_name: ?[]const u8,
    epoch_s: ?i64,
    stop_s: ?u32,
    /// Along the route, as gpxz measures it: the sort key of a waypoint, since gpxz matches
    /// the waypoints to the track in file order.
    distance_m: f64,
    /// From the waypoint to the track point gpxz matches it to.
    offset_m: f64,
};

const GeometryReport = struct {
    name: ?[]const u8,
    description: ?[]const u8,
    distance_m: f64,
    elevation_gain_m: f64,
    elevation_loss_m: f64,
    /// Four numbers per point: latitude, longitude, elevation_m, distance_m. Flat, because
    /// a route runs to thousands of points and an array per point triples the JSON.
    points: []const f64,
    waypoints: []const WaypointReport,
};

fn geometry_json(
    scratch: std.mem.Allocator,
    output: std.mem.Allocator,
    gpx_bytes: []const u8,
) ![]u8 {
    var data = try gpxz.parse(scratch, gpx_bytes, &default_settings);
    defer data.deinit(scratch);
    const trace = &data.trace;
    if (trace.points.len < 2) return error.TraceTooShort;
    assert(trace.points.len == trace.distances_m_cumulative.len);

    const points = try scratch.alloc(f64, trace.points.len * 4);
    defer scratch.free(points);
    for (trace.points, trace.distances_m_cumulative, 0..) |point, distance_m, index| {
        points[index * 4 + 0] = point[gpxz.gps_point.latitude_index];
        points[index * 4 + 1] = point[gpxz.gps_point.longitude_index];
        points[index * 4 + 2] = point[gpxz.gps_point.elevation_index];
        points[index * 4 + 3] = distance_m;
    }

    const waypoints = try waypoints_locate(scratch, trace, data.waypoints);
    defer scratch.free(waypoints);

    const report: GeometryReport = .{
        .name = data.metadata.name,
        .description = data.metadata.description,
        .distance_m = trace.distance_m,
        .elevation_gain_m = trace.elevation_gain_m,
        .elevation_loss_m = trace.elevation_loss_m,
        .points = points,
        .waypoints = waypoints,
    };
    return json_stringify(output, report);
}

/// Places each waypoint on the trace by gpxz's rule: after the previous one, so a loop
/// course can't snap back to an earlier pass through the same place. The caller owns the
/// result.
fn waypoints_locate(
    allocator: std.mem.Allocator,
    trace: *const gpxz.Trace,
    waypoints: []const gpxz.Waypoint,
) ![]WaypointReport {
    const reports = try allocator.alloc(WaypointReport, waypoints.len);
    errdefer allocator.free(reports);

    var search_start: usize = 0;
    for (waypoints, reports) |waypoint, *report| {
        const target = [3]f64{ waypoint.latitude, waypoint.longitude, 0.0 };
        const closest = trace.closest_point_after(target, search_start) orelse
            return error.TraceTooShort;
        search_start = closest.index;
        report.* = .{
            .latitude = waypoint.latitude,
            .longitude = waypoint.longitude,
            .elevation_m = waypoint.elevation_m,
            .name = waypoint.name,
            .description = waypoint.description,
            .comment = waypoint.comment,
            .symbol = waypoint.symbol,
            .type_name = waypoint.type_name,
            .epoch_s = waypoint.epoch_s,
            .stop_s = waypoint.stop_s,
            .distance_m = trace.distances_m_cumulative[closest.index],
            .offset_m = closest.distance_m,
        };
    }
    return reports;
}

/// A place on the track a click can land on.
const Candidate = struct {
    latitude: f64,
    longitude: f64,
    elevation_m: f64,
    /// Along the route, as gpxz measures it.
    distance_m: f64,
    /// From the click to the track point.
    offset_m: f64,
};

fn snap_json(
    scratch: std.mem.Allocator,
    output: std.mem.Allocator,
    gpx_bytes: []const u8,
    latitude: f64,
    longitude: f64,
    radius_m: f64,
) ![]u8 {
    if (!(radius_m > 0 and radius_m <= radius_m_max)) return error.RadiusInvalid;
    if (!std.math.isFinite(latitude) or !std.math.isFinite(longitude)) {
        return error.CoordinateInvalid;
    }
    if (latitude < -90 or latitude > 90 or longitude < -180 or longitude > 180) {
        return error.CoordinateInvalid;
    }

    var data = try gpxz.parse(scratch, gpx_bytes, &default_settings);
    defer data.deinit(scratch);
    if (data.trace.points.len < 2) return error.TraceTooShort;

    const candidates = try candidates_find(
        scratch,
        &data.trace,
        data.points_full_resolution,
        .{ latitude, longitude, 0.0 },
        radius_m,
    );
    defer scratch.free(candidates);
    assert(candidates.len <= candidates_max);
    return json_stringify(output, candidates);
}

/// A run of consecutive track points within the radius: one pass of the track by the click.
const Run = struct {
    index: usize,
    offset_m: f64,
};

fn point_json(
    scratch: std.mem.Allocator,
    output: std.mem.Allocator,
    gpx_bytes: []const u8,
    distance_m: f64,
) ![]u8 {
    if (!(std.math.isFinite(distance_m) and distance_m >= 0)) return error.DistanceInvalid;
    var data = try gpxz.parse(scratch, gpx_bytes, &default_settings);
    defer data.deinit(scratch);
    if (data.trace.points.len < 2) return error.TraceTooShort;
    if (distance_m > data.trace.distance_m) return error.DistanceInvalid;
    return json_stringify(output, point_at(&data.trace, distance_m));
}

/// Returns the place `distance_m` along the trace, between the two trace points around it.
/// why interpolate: the trace is simplified, so on a straight stretch its points can be a
/// kilometre apart; the nearest one would move a checkpoint that far. The segment between
/// two kept points stays within the simplification's tolerance (2 m) of the track.
fn point_at(trace: *const gpxz.Trace, distance_m: f64) Candidate {
    assert(trace.points.len >= 2);
    assert(distance_m >= 0 and distance_m <= trace.distance_m);
    const after = @max(trace.index_at_distance(distance_m), 1);
    const before = after - 1;
    const start_m = trace.distances_m_cumulative[before];
    const length_m = trace.distances_m_cumulative[after] - start_m;
    // Two points at one place (a GPS pause) make a segment of no length.
    const fraction = if (length_m > 0)
        std.math.clamp((distance_m - start_m) / length_m, 0, 1)
    else
        0;
    const a = trace.points[before];
    const b = trace.points[after];
    const point = gpxz.gps_point;
    return .{
        .latitude = lerp(a[point.latitude_index], b[point.latitude_index], fraction),
        .longitude = lerp(a[point.longitude_index], b[point.longitude_index], fraction),
        .elevation_m = lerp(a[point.elevation_index], b[point.elevation_index], fraction),
        .distance_m = distance_m,
        .offset_m = 0,
    };
}

fn lerp(from: f64, to: f64, fraction: f64) f64 {
    assert(fraction >= 0 and fraction <= 1);
    return from + (to - from) * fraction;
}

/// Returns one candidate per pass of the track within `radius_m` of `target`, in route
/// order. `points_flat` is the full-resolution track, [latitude, longitude, elevation] per
/// point: snapping to a point the file has keeps the pin exactly on the track, which the
/// simplified trace (within 2 m of it) would not. The caller owns the result.
fn candidates_find(
    allocator: std.mem.Allocator,
    trace: *const gpxz.Trace,
    points_flat: []const f64,
    target: [3]f64,
    radius_m: f64,
) ![]Candidate {
    assert(points_flat.len % 3 == 0 and points_flat.len >= 6);
    assert(radius_m > 0 and radius_m <= radius_m_max);

    var runs: std.ArrayList(Run) = .empty;
    defer runs.deinit(allocator);

    // A flat approximation of the distance, to skip the points that are far (nearly all of
    // them) without a Haversine each. Exact distances are computed for the winners only.
    const meters_per_degree = 111_320.0;
    const longitude_scale = @cos(std.math.degreesToRadians(target[0]));
    const radius_squared_m = radius_m * radius_m * 1.21; // 10% margin for the approximation.
    var current: ?Run = null;
    var index: usize = 0;
    while (index < points_flat.len / 3) : (index += 1) {
        const delta_y_m = (points_flat[index * 3] - target[0]) * meters_per_degree;
        const delta_x_m = (points_flat[index * 3 + 1] - target[1]) * meters_per_degree *
            longitude_scale;
        const near = delta_x_m * delta_x_m + delta_y_m * delta_y_m <= radius_squared_m;
        if (!near) {
            if (current) |run| try runs.append(allocator, run);
            current = null;
            continue;
        }
        const point = [3]f64{ points_flat[index * 3], points_flat[index * 3 + 1], 0.0 };
        const offset_m = gpxz.gps_point.distance(target, point);
        if (offset_m > radius_m) {
            if (current) |run| try runs.append(allocator, run);
            current = null;
            continue;
        }
        if (current == null or offset_m < current.?.offset_m) {
            current = .{ .index = index, .offset_m = offset_m };
        }
    }
    if (current) |run| try runs.append(allocator, run);

    // Too many passes: keep the closest ones.
    if (runs.items.len > candidates_max) {
        std.sort.pdq(Run, runs.items, {}, run_closer);
        runs.shrinkRetainingCapacity(candidates_max);
        std.sort.pdq(Run, runs.items, {}, run_earlier);
    }
    assert(runs.items.len <= candidates_max);

    const trace_indices = try trace_indices_map(allocator, trace, points_flat);
    defer allocator.free(trace_indices);
    const candidates = try allocator.alloc(Candidate, runs.items.len);
    errdefer allocator.free(candidates);
    for (runs.items, candidates) |run, *candidate| {
        assert(run.index < trace_indices.len);
        candidate.* = .{
            .latitude = points_flat[run.index * 3],
            .longitude = points_flat[run.index * 3 + 1],
            .elevation_m = points_flat[run.index * 3 + 2],
            .distance_m = trace.distances_m_cumulative[trace_indices[run.index]],
            .offset_m = run.offset_m,
        };
    }
    return candidates;
}

/// Returns, for each point of the full-resolution track, the index of the trace point that
/// stands for it: the point itself when the trace kept it, else the last one kept before it.
/// The trace is the track with points dropped, in order, so walking both together matches
/// them exactly. Looking a point up by its place instead would send the second pass of an
/// out-and-back to the first, whose coordinates are the same. The caller owns the result.
fn trace_indices_map(
    allocator: std.mem.Allocator,
    trace: *const gpxz.Trace,
    points_flat: []const f64,
) ![]u32 {
    assert(points_flat.len % 3 == 0 and points_flat.len >= 6);
    const count = points_flat.len / 3;
    assert(count <= std.math.maxInt(u32));
    const indices = try allocator.alloc(u32, count);
    errdefer allocator.free(indices);

    var kept: usize = 0;
    for (indices, 0..) |*slot, index| {
        const point = points_flat[index * 3 ..][0..3];
        if (kept < trace.points.len and std.mem.eql(f64, point, &trace.points[kept])) {
            kept += 1;
        }
        // The first point is always kept, so at least one trace point has matched by now.
        if (kept == 0) return error.TraceMismatch;
        slot.* = @intCast(kept - 1);
    }
    // Every trace point is a track point: one left over means the trace is not a subset.
    if (kept != trace.points.len) return error.TraceMismatch;
    return indices;
}

fn run_closer(_: void, a: Run, b: Run) bool {
    return a.offset_m < b.offset_m;
}

fn run_earlier(_: void, a: Run, b: Run) bool {
    return a.index < b.index;
}

/// A pin as JavaScript sends it: a waypoint, and where it sits along the route. The fields are
/// the ones `routeGeometry` reports its waypoints with, so a waypoint it reported is a pin as
/// it is (its `offset_m` is ignored).
const Pin = struct {
    latitude: f64,
    longitude: f64,
    elevation_m: ?f64 = null,
    name: []const u8 = "",
    description: ?[]const u8 = null,
    comment: ?[]const u8 = null,
    symbol: ?[]const u8 = null,
    type_name: ?[]const u8 = null,
    epoch_s: ?i64 = null,
    /// The race clock's offset at `epoch_s`, written after the time ("+02:00"): gpxz puts the
    /// night on the start's local clock. Whole minutes within ±14:00; 0 writes UTC ("Z").
    utc_offset_s: i32 = 0,
    stop_s: ?u32 = null,
    /// Along the route, as gpxz measures it: the pins must come in this order.
    distance_m: f64,
};

/// More pins than any race has checkpoints. It bounds what a caller's JSON can ask for.
pub const pins_max: u32 = 4096;

/// Returns `gpx_bytes` with its waypoints replaced by the pins in `pins_json`, allocated with
/// `output`. The pins are written in the order given, which must be route order: gpxz
/// matches the waypoints to the track in file order, each after the previous one.
fn edited_bytes(
    scratch: std.mem.Allocator,
    output: std.mem.Allocator,
    gpx_bytes: []const u8,
    pins_json: []const u8,
) ![]u8 {
    const parsed = try std.json.parseFromSlice(
        []Pin,
        scratch,
        pins_json,
        .{ .ignore_unknown_fields = true },
    );
    defer parsed.deinit();
    const pins = parsed.value;
    if (pins.len > pins_max) return error.TooManyPins;
    for (pins, 0..) |pin, index| {
        const offset_s = pin.utc_offset_s;
        if (@abs(offset_s) > gpxz.time.utc_offset_s_max or @mod(offset_s, 60) != 0) {
            return error.TimeZoneInvalid;
        }
        if (!std.math.isFinite(pin.distance_m)) return error.PinsNotInRouteOrder;
        if (index > 0 and pin.distance_m < pins[index - 1].distance_m) {
            return error.PinsNotInRouteOrder;
        }
    }

    const waypoints = try scratch.alloc(gpxz.Waypoint, pins.len);
    defer scratch.free(waypoints);
    for (pins, waypoints) |pin, *waypoint| {
        waypoint.* = .{
            .latitude = pin.latitude,
            .longitude = pin.longitude,
            .elevation_m = pin.elevation_m,
            .name = pin.name,
            .description = pin.description,
            .comment = pin.comment,
            .symbol = pin.symbol,
            .type_name = pin.type_name,
            .epoch_s = pin.epoch_s,
            .utc_offset_s = pin.utc_offset_s,
            .stop_s = pin.stop_s,
        };
    }
    assert(waypoints.len == pins.len);
    return gpxz.waypoints_replace(output, gpx_bytes, waypoints);
}

/// Everything in gpxz's GPXData except the per-point arrays, which run to several MiB on a
/// long route. Mirrors what `gpxz --json` prints.
const PlanReport = struct {
    name: ?[]const u8,
    description: ?[]const u8,
    distance_m: f64,
    elevation_gain_m: f64,
    elevation_loss_m: f64,
    climbs: []const gpxz.ClimbStats,
    waypoints: []const gpxz.Waypoint,
    sections: ?[]const gpxz.SectionStats,
    stages: ?[]const gpxz.StageStats,
    plan: ?[]const gpxz.PlanEntry,
};

fn plan_json(
    scratch: std.mem.Allocator,
    output: std.mem.Allocator,
    gpx_bytes: []const u8,
    settings: PlanSettings,
) ![]u8 {
    if (!(settings.pace_base_s_per_km > 0 and std.math.isFinite(settings.pace_base_s_per_km))) {
        return error.SettingsInvalid;
    }
    if (!(settings.fatigue_coefficient >= 0 and std.math.isFinite(settings.fatigue_coefficient))) {
        return error.SettingsInvalid;
    }
    const gpxz_settings = settings.to_gpxz();
    var data = try gpxz.parse(scratch, gpx_bytes, &gpxz_settings);
    defer data.deinit(scratch);

    const report: PlanReport = .{
        .name = data.metadata.name,
        .description = data.metadata.description,
        .distance_m = data.trace.distance_m,
        .elevation_gain_m = data.trace.elevation_gain_m,
        .elevation_loss_m = data.trace.elevation_loss_m,
        .climbs = data.trace.climbs,
        .waypoints = data.waypoints,
        .sections = data.sections,
        .stages = data.stages,
        .plan = data.plan,
    };
    return json_stringify(output, report);
}

fn json_stringify(allocator: std.mem.Allocator, value: anytype) ![]u8 {
    var out: std.Io.Writer.Allocating = .init(allocator);
    errdefer out.deinit();
    try std.json.Stringify.value(value, .{}, &out.writer);
    const json = try out.toOwnedSlice();
    assert(json.len > 0);
    return json;
}

// ── Tests ───────────────────────────────────────────────────────────────────────────────

const testing = std.testing;
const fixture_gpx = @embedFile("fixture.gpx");

/// The fixture runs due north along longitude -0.01, from latitude 42.73 to 42.7839.
const fixture_longitude = -0.0100000;
const fixture_latitude_middle = 42.7569493;

/// A JSON number: std.json prints a whole float as an integer, and parses it back as one.
fn number(value: std.json.Value) f64 {
    return switch (value) {
        .float => |float| float,
        .integer => |integer| @floatFromInt(integer),
        else => unreachable,
    };
}

fn parse_json(json: []const u8) !std.json.Parsed(std.json.Value) {
    return std.json.parseFromSlice(std.json.Value, testing.allocator, json, .{});
}

test "routeGeometry: points are flat and ordered, waypoints sit on the track" {
    const json = try geometry_json(testing.allocator, testing.allocator, fixture_gpx);
    defer testing.allocator.free(json);
    const parsed = try parse_json(json);
    defer parsed.deinit();
    const root = parsed.value.object;

    const points = root.get("points").?.array.items;
    try testing.expect(points.len >= 8 and points.len % 4 == 0);
    // Distance grows along the route, from zero.
    try testing.expectEqual(@as(f64, 0), number(points[3]));
    var previous: f64 = -1;
    var index: usize = 3;
    while (index < points.len) : (index += 4) {
        try testing.expect(number(points[index]) > previous);
        previous = number(points[index]);
    }
    try testing.expect(number(root.get("distance_m").?) > 5000);

    const waypoints = root.get("waypoints").?.array.items;
    try testing.expectEqual(@as(usize, 3), waypoints.len);
    var distance_previous: f64 = -1;
    for (waypoints) |waypoint| {
        const distance_m = number(waypoint.object.get("distance_m").?);
        try testing.expect(distance_m >= distance_previous);
        try testing.expect(number(waypoint.object.get("offset_m").?) < 50);
        distance_previous = distance_m;
    }
    try testing.expectEqualStrings("Refuge", waypoints[1].object.get("name").?.string);
    try testing.expectEqualStrings("TimeBarrier", waypoints[1].object.get("type_name").?.string);
}

test "routeGeometry: a file without track points is rejected" {
    const bytes = "<gpx><wpt lat=\"1\" lon=\"1\"><ele>0</ele><name>A</name></wpt></gpx>";
    try testing.expectError(
        error.TraceTooShort,
        geometry_json(testing.allocator, testing.allocator, bytes),
    );
}

test "routeGeometry: a malformed file is rejected, not half read" {
    const bytes = "<gpx><trk><trkseg><trkpt lat=\"1\" lon=\"1\"></trkpt></trkseg></trk></gpx>";
    try testing.expectError(
        error.ElevationMissing,
        geometry_json(testing.allocator, testing.allocator, bytes),
    );
}

test "snapCandidates: a click beside the track lands on it" {
    const json = try snap_json(
        testing.allocator,
        testing.allocator,
        fixture_gpx,
        fixture_latitude_middle,
        fixture_longitude + 0.0002, // about 16 m east.
        100,
    );
    defer testing.allocator.free(json);
    const parsed = try parse_json(json);
    defer parsed.deinit();

    const candidates = parsed.value.array.items;
    try testing.expectEqual(@as(usize, 1), candidates.len);
    const candidate = candidates[0].object;
    try testing.expectApproxEqAbs(fixture_longitude, number(candidate.get("longitude").?), 1e-9);
    try testing.expectApproxEqAbs(
        fixture_latitude_middle,
        number(candidate.get("latitude").?),
        0.001,
    );
    try testing.expect(number(candidate.get("offset_m").?) > 5);
    try testing.expect(number(candidate.get("offset_m").?) < 30);
    // Half way along a 6 km route.
    const distance_m = number(candidate.get("distance_m").?);
    try testing.expect(distance_m > 2500 and distance_m < 3500);
}

test "snapCandidates: a click far from the track has no candidate" {
    const json = try snap_json(
        testing.allocator,
        testing.allocator,
        fixture_gpx,
        fixture_latitude_middle,
        fixture_longitude + 0.01, // about 800 m east.
        100,
    );
    defer testing.allocator.free(json);
    try testing.expectEqualStrings("[]", json);
}

test "snapCandidates: the radius and the coordinates are checked" {
    const allocator = testing.allocator;
    try testing.expectError(
        error.RadiusInvalid,
        snap_json(allocator, allocator, fixture_gpx, 42.75, -0.01, 0),
    );
    try testing.expectError(
        error.RadiusInvalid,
        snap_json(allocator, allocator, fixture_gpx, 42.75, -0.01, radius_m_max + 1),
    );
    try testing.expectError(
        error.RadiusInvalid,
        snap_json(allocator, allocator, fixture_gpx, 42.75, -0.01, std.math.nan(f64)),
    );
    try testing.expectError(
        error.CoordinateInvalid,
        snap_json(allocator, allocator, fixture_gpx, 91, -0.01, 100),
    );
    try testing.expectError(
        error.CoordinateInvalid,
        snap_json(allocator, allocator, fixture_gpx, std.math.nan(f64), -0.01, 100),
    );
}

/// An out-and-back route: 2.2 km north along longitude 0, then the same way back, a point
/// every 0.001 degrees of latitude (about 111 m).
fn out_and_back_build(allocator: std.mem.Allocator) ![]u8 {
    var out: std.Io.Writer.Allocating = .init(allocator);
    errdefer out.deinit();
    const writer = &out.writer;
    try writer.writeAll("<gpx version=\"1.1\"><trk><trkseg>");
    var step: u32 = 0;
    while (step <= 40) : (step += 1) {
        // 0..20 going out, 21..40 coming back.
        const latitude_steps: u32 = if (step <= 20) step else 40 - step;
        const latitude = 42.0 + @as(f64, @floatFromInt(latitude_steps)) * 0.001;
        try writer.print(
            "<trkpt lat=\"{d:.6}\" lon=\"0.0\"><ele>{d}</ele></trkpt>",
            .{ latitude, 1000 + latitude_steps },
        );
    }
    try writer.writeAll("</trkseg></trk></gpx>");
    return out.toOwnedSlice();
}

test "snapCandidates: an out-and-back place offers both passes, in route order" {
    const gpx_bytes = try out_and_back_build(testing.allocator);
    defer testing.allocator.free(gpx_bytes);

    const json = try snap_json(testing.allocator, testing.allocator, gpx_bytes, 42.010, 0.0, 50);
    defer testing.allocator.free(json);
    const parsed = try parse_json(json);
    defer parsed.deinit();

    const candidates = parsed.value.array.items;
    try testing.expectEqual(@as(usize, 2), candidates.len);
    const first = number(candidates[0].object.get("distance_m").?);
    const second = number(candidates[1].object.get("distance_m").?);
    // Out at about 1.1 km, back at about 3.3 km of a 4.4 km route.
    try testing.expect(first < second);
    try testing.expect(first > 1000 and first < 1250);
    try testing.expect(second > 3150 and second < 3400);
    try testing.expectApproxEqAbs(
        number(candidates[0].object.get("latitude").?),
        number(candidates[1].object.get("latitude").?),
        1e-9,
    );
}

test "snapCandidates: no more than candidates_max passes, in route order" {
    // A zigzag that touches longitude 0 twelve times and swings 800 m away in between.
    var out: std.Io.Writer.Allocating = .init(testing.allocator);
    defer out.deinit();
    try out.writer.writeAll("<gpx version=\"1.1\"><trk><trkseg>");
    var step: u32 = 0;
    while (step < 24) : (step += 1) {
        const longitude: f64 = if (step % 2 == 0) 0.0 else 0.01;
        try out.writer.print(
            "<trkpt lat=\"{d:.6}\" lon=\"{d:.6}\"><ele>0</ele></trkpt>",
            .{ 42.0 + @as(f64, @floatFromInt(step)) * 0.0001, longitude },
        );
    }
    try out.writer.writeAll("</trkseg></trk></gpx>");

    const gpx_bytes = out.written();
    const json = try snap_json(testing.allocator, testing.allocator, gpx_bytes, 42.0012, 0.0, 200);
    defer testing.allocator.free(json);
    const parsed = try parse_json(json);
    defer parsed.deinit();

    const candidates = parsed.value.array.items;
    try testing.expectEqual(@as(usize, candidates_max), candidates.len);
    var previous: f64 = -1;
    for (candidates) |candidate| {
        const distance_m = number(candidate.object.get("distance_m").?);
        try testing.expect(distance_m > previous);
        previous = distance_m;
    }
}

test "pointAtDistance: half way along the fixture is half way up its latitudes" {
    var data = try gpxz.parse(testing.allocator, fixture_gpx, &default_settings);
    defer data.deinit(testing.allocator);
    const half_m = data.trace.distance_m / 2;

    const json = try point_json(testing.allocator, testing.allocator, fixture_gpx, half_m);
    defer testing.allocator.free(json);
    const parsed = try parse_json(json);
    defer parsed.deinit();
    const point = parsed.value.object;
    try testing.expectApproxEqAbs(half_m, number(point.get("distance_m").?), 1e-6);
    try testing.expectApproxEqAbs(fixture_longitude, number(point.get("longitude").?), 1e-6);
    // The fixture runs straight north, so distance and latitude grow together.
    try testing.expectApproxEqAbs(fixture_latitude_middle, number(point.get("latitude").?), 0.001);
    try testing.expectEqual(@as(f64, 0), number(point.get("offset_m").?));
}

test "pointAtDistance: the ends of the route are its first and last points" {
    var data = try gpxz.parse(testing.allocator, fixture_gpx, &default_settings);
    defer data.deinit(testing.allocator);
    const trace = &data.trace;
    const first = point_at(trace, 0);
    try testing.expectEqual(trace.points[0][0], first.latitude);
    const last = point_at(trace, trace.distance_m);
    try testing.expectEqual(trace.points[trace.points.len - 1][0], last.latitude);
}

test "pointAtDistance: between two kept points, the place is on the segment" {
    const gpx_bytes = try out_and_back_build(testing.allocator);
    defer testing.allocator.free(gpx_bytes);
    var data = try gpxz.parse(testing.allocator, gpx_bytes, &default_settings);
    defer data.deinit(testing.allocator);
    const trace = &data.trace;
    // A quarter of the way along the second segment, whatever the trace kept.
    const start_m = trace.distances_m_cumulative[1];
    const length_m = trace.distances_m_cumulative[2] - start_m;
    const point = point_at(trace, start_m + length_m / 4);
    const expected = trace.points[1][0] + (trace.points[2][0] - trace.points[1][0]) / 4;
    try testing.expectApproxEqAbs(expected, point.latitude, 1e-9);
    // On the way back, the same distance from the far end is the same place.
    const back = point_at(trace, trace.distance_m - start_m - length_m / 4);
    try testing.expectApproxEqAbs(point.latitude, back.latitude, 1e-6);
}

test "pointAtDistance: a distance off the route is refused" {
    const allocator = testing.allocator;
    const cases = [_]f64{ -1, 1e9, std.math.nan(f64), std.math.inf(f64) };
    for (cases) |distance_m| {
        try testing.expectError(
            error.DistanceInvalid,
            point_json(allocator, allocator, fixture_gpx, distance_m),
        );
    }
}

test "plan_json: sections and stages from the waypoints" {
    const json = try plan_json(testing.allocator, testing.allocator, fixture_gpx, .{});
    defer testing.allocator.free(json);
    const parsed = try parse_json(json);
    defer parsed.deinit();
    const root = parsed.value.object;
    try testing.expect(number(root.get("distance_m").?) > 0);
    try testing.expectEqual(@as(usize, 3), root.get("waypoints").?.array.items.len);
    try testing.expectEqual(@as(usize, 2), root.get("sections").?.array.items.len);
}

test "plan_json: settings are checked" {
    try testing.expectError(
        error.SettingsInvalid,
        plan_json(testing.allocator, testing.allocator, fixture_gpx, .{ .pace_base_s_per_km = 0 }),
    );
    try testing.expectError(
        error.SettingsInvalid,
        plan_json(
            testing.allocator,
            testing.allocator,
            fixture_gpx,
            .{ .fatigue_coefficient = -1 },
        ),
    );
}

test "trace_indices_map: every track point maps to a kept point, in order" {
    var data = try gpxz.parse(testing.allocator, fixture_gpx, &default_settings);
    defer data.deinit(testing.allocator);
    const points_flat = data.points_full_resolution;
    const indices = try trace_indices_map(testing.allocator, &data.trace, points_flat);
    defer testing.allocator.free(indices);

    try testing.expectEqual(data.points_full_resolution.len / 3, indices.len);
    try testing.expectEqual(@as(u32, 0), indices[0]);
    const last: u32 = @intCast(data.trace.points.len - 1);
    try testing.expectEqual(last, indices[indices.len - 1]);
    for (indices[1..], indices[0 .. indices.len - 1]) |current, previous| {
        try testing.expect(current >= previous and current - previous <= 1);
    }
}

test "trace_indices_map: a track the trace was not made from is a mismatch" {
    var data = try gpxz.parse(testing.allocator, fixture_gpx, &default_settings);
    defer data.deinit(testing.allocator);
    // Moves the last point, which the trace always keeps.
    const other = try testing.allocator.dupe(f64, data.points_full_resolution);
    defer testing.allocator.free(other);
    other[other.len - 3] += 0.5;
    try testing.expectError(
        error.TraceMismatch,
        trace_indices_map(testing.allocator, &data.trace, other),
    );
}

/// The fixture's waypoints as the pins JavaScript would hold, with the cutoff of the second one
/// moved to `refuge_epoch_s`.
fn pins_json_make(allocator: std.mem.Allocator, refuge_epoch_s: i64) ![]u8 {
    const json = try geometry_json(allocator, allocator, fixture_gpx);
    defer allocator.free(json);
    const parsed = try parse_json(json);
    defer parsed.deinit();
    var waypoints = parsed.value.object.get("waypoints").?.array;
    waypoints.items[1].object.getPtr("epoch_s").?.* = .{ .integer = refuge_epoch_s };
    var out: std.Io.Writer.Allocating = .init(allocator);
    errdefer out.deinit();
    try std.json.Stringify.value(std.json.Value{ .array = waypoints }, .{}, &out.writer);
    return out.toOwnedSlice();
}

const fixture_refuge_epoch_s: i64 = 1780732800; // 2026-06-06T08:00:00Z.

test "exportGpx: the waypoints the geometry reported are written back as they were" {
    const pins = try pins_json_make(testing.allocator, fixture_refuge_epoch_s);
    defer testing.allocator.free(pins);
    const out = try edited_bytes(testing.allocator, testing.allocator, fixture_gpx, pins);
    defer testing.allocator.free(out);

    var data = try gpxz.parse(testing.allocator, out, &default_settings);
    defer data.deinit(testing.allocator);
    var original = try gpxz.parse(testing.allocator, fixture_gpx, &default_settings);
    defer original.deinit(testing.allocator);
    try testing.expectEqual(original.waypoints.len, data.waypoints.len);
    for (original.waypoints, data.waypoints) |expected, actual| {
        try testing.expectEqualStrings(expected.name, actual.name);
        try testing.expectEqualStrings(expected.type_name.?, actual.type_name.?);
        try testing.expectEqual(expected.epoch_s, actual.epoch_s);
        try testing.expectEqual(expected.latitude, actual.latitude);
    }
    try testing.expectEqual(original.trace.distance_m, data.trace.distance_m);
}

test "exportGpx: a new pin is a new checkpoint, and an edit moves a cutoff" {
    const later_s = fixture_refuge_epoch_s + 1800;
    const pins = try pins_json_make(testing.allocator, later_s);
    defer testing.allocator.free(pins);
    const out = try edited_bytes(testing.allocator, testing.allocator, fixture_gpx, pins);
    defer testing.allocator.free(out);
    var data = try gpxz.parse(testing.allocator, out, &default_settings);
    defer data.deinit(testing.allocator);
    try testing.expectEqual(later_s, data.waypoints[1].epoch_s.?);

    const extra =
        \\[{"latitude":42.73,"longitude":-0.01,"name":"A","type_name":"Start",
        \\  "epoch_s":1780725600,"distance_m":0},
        \\ {"latitude":42.75,"longitude":-0.01,"name":"B <&> C","type_name":"TimeBarrier",
        \\  "epoch_s":1780732800,"stop_s":600,"description":"Soup","distance_m":2200},
        \\ {"latitude":42.7838987,"longitude":-0.01,"name":"D","type_name":"Arrival",
        \\  "epoch_s":1780740000,"distance_m":6000}]
    ;
    const edited = try edited_bytes(testing.allocator, testing.allocator, fixture_gpx, extra);
    defer testing.allocator.free(edited);
    var again = try gpxz.parse(testing.allocator, edited, &default_settings);
    defer again.deinit(testing.allocator);
    try testing.expectEqual(@as(usize, 3), again.waypoints.len);
    try testing.expectEqualStrings("B <&> C", again.waypoints[1].name);
    try testing.expectEqual(@as(?u32, 600), again.waypoints[1].stop_s);
    try testing.expectEqualStrings("Soup", again.waypoints[1].description.?);
}

test "exportGpx: a time keeps the race's offset, and reads back on the same clock" {
    const json =
        \\[{"latitude":42.73,"longitude":-0.01,"name":"A","type_name":"Start",
        \\  "epoch_s":1780725600,"utc_offset_s":7200,"distance_m":0},
        \\ {"latitude":42.7838987,"longitude":-0.01,"name":"D","type_name":"Arrival",
        \\  "epoch_s":1780740000,"distance_m":6000}]
    ;
    const out = try edited_bytes(testing.allocator, testing.allocator, fixture_gpx, json);
    defer testing.allocator.free(out);
    // 1780725600 is 06:00Z: 08:00 at UTC+2. A pin without an offset stays in UTC.
    try testing.expect(std.mem.indexOf(u8, out, "<time>2026-06-06T08:00:00+02:00</time>") != null);
    try testing.expect(std.mem.indexOf(u8, out, "<time>2026-06-06T10:00:00Z</time>") != null);
    var data = try gpxz.parse(testing.allocator, out, &default_settings);
    defer data.deinit(testing.allocator);
    try testing.expectEqual(@as(?i64, 1780725600), data.waypoints[0].epoch_s);
    try testing.expectEqual(@as(i32, 7200), data.waypoints[0].utc_offset_s);
}

test "exportGpx: an offset past 14:00 or not in whole minutes is refused" {
    for ([_][]const u8{ "50460", "-50460", "7230" }) |offset| {
        const json = try std.fmt.allocPrint(
            testing.allocator,
            "[{{\"latitude\":42.73,\"longitude\":-0.01,\"epoch_s\":1780725600," ++
                "\"utc_offset_s\":{s},\"distance_m\":0}}]",
            .{offset},
        );
        defer testing.allocator.free(json);
        try testing.expectError(
            error.TimeZoneInvalid,
            edited_bytes(testing.allocator, testing.allocator, fixture_gpx, json),
        );
    }
}

test "exportGpx: pins out of route order are refused" {
    const json =
        \\[{"latitude":42.73,"longitude":-0.01,"distance_m":500},
        \\ {"latitude":42.75,"longitude":-0.01,"distance_m":100}]
    ;
    try testing.expectError(
        error.PinsNotInRouteOrder,
        edited_bytes(testing.allocator, testing.allocator, fixture_gpx, json),
    );
}

test "exportGpx: pins at the same distance are in order" {
    const json =
        \\[{"latitude":42.73,"longitude":-0.01,"name":"out","distance_m":500},
        \\ {"latitude":42.73,"longitude":-0.01,"name":"back","distance_m":500}]
    ;
    const out = try edited_bytes(testing.allocator, testing.allocator, fixture_gpx, json);
    testing.allocator.free(out);
}

test "exportGpx: what is not a list of pins is an error" {
    const allocator = testing.allocator;
    const cases = [_][]const u8{
        "",
        "not json",
        "{}",
        "[{}]",
        "[{\"latitude\":1}]",
        "[{\"latitude\":1,\"longitude\":2}]",
        "[{\"latitude\":\"x\",\"longitude\":2,\"distance_m\":0}]",
    };
    for (cases) |json| {
        const result = edited_bytes(allocator, allocator, fixture_gpx, json);
        if (result) |bytes| {
            allocator.free(bytes);
            return error.TestExpectedError;
        } else |_| {}
    }
}

test "exportGpx: a pin that cannot be written is refused with gpxz's error" {
    const json = "[{\"latitude\":91,\"longitude\":0,\"distance_m\":0}]";
    try testing.expectError(
        error.CoordinateInvalid,
        edited_bytes(testing.allocator, testing.allocator, fixture_gpx, json),
    );
}

test "exportGpx: no more than pins_max pins" {
    var json: std.ArrayList(u8) = .empty;
    defer json.deinit(testing.allocator);
    try json.append(testing.allocator, '[');
    for (0..pins_max + 1) |index| {
        if (index > 0) try json.append(testing.allocator, ',');
        const pin = "{\"latitude\":1,\"longitude\":1,\"distance_m\":0}";
        try json.appendSlice(testing.allocator, pin);
    }
    try json.append(testing.allocator, ']');
    try testing.expectError(
        error.TooManyPins,
        edited_bytes(testing.allocator, testing.allocator, fixture_gpx, json.items),
    );
}

test "exportGpx: a file that is not GPX is refused" {
    try testing.expectError(
        error.NotGpx,
        edited_bytes(testing.allocator, testing.allocator, "hello", "[]"),
    );
}

test "summarizeEdit: the plan follows the pins" {
    const pins = try pins_json_make(testing.allocator, fixture_refuge_epoch_s);
    defer testing.allocator.free(pins);
    const edited = try edited_bytes(testing.allocator, testing.allocator, fixture_gpx, pins);
    defer testing.allocator.free(edited);
    const json = try plan_json(testing.allocator, testing.allocator, edited, .{});
    defer testing.allocator.free(json);
    const parsed = try parse_json(json);
    defer parsed.deinit();
    const plan = parsed.value.object.get("plan").?.array.items;
    try testing.expectEqual(@as(usize, 3), plan.len);
    try testing.expectEqual(
        @as(f64, @floatFromInt(fixture_refuge_epoch_s)),
        number(plan[1].object.get("epoch_s_cutoff").?),
    );
}
