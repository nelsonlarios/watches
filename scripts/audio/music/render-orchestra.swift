import Foundation
import AVFoundation

struct Track: Decodable {
    let id: String
    let program: Int
    let instrument: String?
    let percussion: Bool?
    let gainDB: Float
    let pan: Float
}
struct Event: Decodable {
    let time: Double
    let track: String
    let kind: String
    let note: Int?
    let velocity: Int?
    let controller: Int?
    let value: Int?
}
struct Score: Decodable {
    let title: String
    let duration: Double
    let soundFont: String
    let reverb: Float
    let tracks: [Track]
    let events: [Event]
}
enum RenderFailure: Error { case invalidArguments, failedFrame, stalled, invalidTrack }

guard CommandLine.arguments.count == 3 else { throw RenderFailure.invalidArguments }
let scoreURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let score = try JSONDecoder().decode(Score.self, from: Data(contentsOf: scoreURL))
let engine = AVAudioEngine()
let bus = AVAudioMixerNode()
let reverb = AVAudioUnitReverb()
let eq = AVAudioUnitEQ(numberOfBands: 2)
let format = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 2)!
engine.attach(bus)
engine.attach(reverb)
engine.attach(eq)
reverb.loadFactoryPreset(.largeHall)
reverb.wetDryMix = score.reverb
eq.bands[0].filterType = .highPass
eq.bands[0].frequency = 38
eq.bands[0].bandwidth = 0.8
eq.bands[0].bypass = false
eq.bands[1].filterType = .highShelf
eq.bands[1].frequency = 8200
eq.bands[1].gain = -1.5
eq.bands[1].bypass = false
engine.connect(bus, to: reverb, format: format)
engine.connect(reverb, to: eq, format: format)
engine.connect(eq, to: engine.mainMixerNode, format: format)
var samplers: [String: AVAudioUnitSampler] = [:]
for track in score.tracks {
    let sampler = AVAudioUnitSampler()
    engine.attach(sampler)
    engine.connect(sampler, to: bus, format: format)
    if let path = track.instrument {
        try sampler.loadInstrument(at: URL(fileURLWithPath: path))
        print("Loaded EXS24 \(track.id): \(path)")
    } else {
        try sampler.loadSoundBankInstrument(at: URL(fileURLWithPath: score.soundFont), program: UInt8(track.program), bankMSB: track.percussion == true ? 0x78 : 0x79, bankLSB: 0)
        print("Loaded SoundFont \(track.id): program \(track.program)")
    }
    sampler.overallGain = track.gainDB
    sampler.stereoPan = track.pan
    sampler.sendController(7, withValue: 100, onChannel: 0)
    sampler.sendController(11, withValue: 110, onChannel: 0)
    samplers[track.id] = sampler
}

try engine.enableManualRenderingMode(.offline, format: format, maximumFrameCount: 512)
engine.prepare()
try engine.start()
let output = try AVAudioFile(forWriting: outputURL, settings: format.settings)
let buffer = AVAudioPCMBuffer(pcmFormat: engine.manualRenderingFormat, frameCapacity: 512)!
let events = score.events.sorted {
    if $0.time == $1.time { return $0.kind == "off" && $1.kind != "off" }
    return $0.time < $1.time
}
let total = AVAudioFramePosition((score.duration * 44100).rounded())
var eventIndex = 0
var stalls = 0
while engine.manualRenderingSampleTime < total {
    let current = engine.manualRenderingSampleTime
    while eventIndex < events.count && AVAudioFramePosition((events[eventIndex].time * 44100).rounded()) <= current {
        let event = events[eventIndex]
        guard let sampler = samplers[event.track] else { throw RenderFailure.invalidTrack }
        switch event.kind {
        case "on": sampler.startNote(UInt8(event.note!), withVelocity: UInt8(event.velocity!), onChannel: 0)
        case "off": sampler.stopNote(UInt8(event.note!), onChannel: 0)
        case "cc": sampler.sendController(UInt8(event.controller!), withValue: UInt8(event.value!), onChannel: 0)
        default: break
        }
        eventIndex += 1
    }
    var requested = min(AVAudioFramePosition(512), total - current)
    if eventIndex < events.count {
        let next = AVAudioFramePosition((events[eventIndex].time * 44100).rounded())
        requested = min(requested, max(1, next - current))
    }
    let status = try engine.renderOffline(AVAudioFrameCount(requested), to: buffer)
    switch status {
    case .success:
        try output.write(from: buffer)
        stalls = 0
    case .cannotDoInCurrentContext:
        stalls += 1
        if stalls > 100 { throw RenderFailure.stalled }
    case .insufficientDataFromInputNode, .error: throw RenderFailure.failedFrame
    @unknown default: throw RenderFailure.failedFrame
    }
}
engine.stop()
print("Rendered \(score.title): \(score.duration)s → \(outputURL.path)")
