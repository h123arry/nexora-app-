import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeChatAttachmentContentType,
  selectVoiceRecordingMimeType,
  voiceRecordingExtension,
} from '../src/utils/chatMediaPolicy';

test('chat attachments normalize common mobile and file-picker MIME types by extension', () => {
  assert.equal(normalizeChatAttachmentContentType('report.pdf', ''), 'application/pdf');
  assert.equal(normalizeChatAttachmentContentType('report.docx', 'application/octet-stream'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(normalizeChatAttachmentContentType('photo.heic', 'application/octet-stream'), 'image/heic');
  assert.equal(normalizeChatAttachmentContentType('recording.m4a', 'audio/x-m4a'), 'audio/mp4');
  assert.equal(normalizeChatAttachmentContentType('archive.zip', 'application/x-zip-compressed'), 'application/zip');
});

test('known extensions correct generic or unsupported picker MIME labels without rewriting valid MIME types', () => {
  assert.equal(normalizeChatAttachmentContentType('voice.wav', 'application/x-unknown'), 'audio/wav');
  assert.equal(normalizeChatAttachmentContentType('voice.mp3', 'audio/mpeg'), 'audio/mpeg');
  assert.equal(normalizeChatAttachmentContentType('unknown.bin', 'application/octet-stream'), 'application/octet-stream');
});

test('voice recording chooses the first browser-supported format', () => {
  const supported = ['audio/mp4', 'audio/wav'];
  assert.equal(selectVoiceRecordingMimeType(type => supported.includes(type)), 'audio/mp4');
  assert.equal(selectVoiceRecordingMimeType(() => false), undefined);
});

test('voice file extensions match the actual recording container', () => {
  assert.equal(voiceRecordingExtension('audio/webm;codecs=opus'), 'webm');
  assert.equal(voiceRecordingExtension('audio/mp4'), 'm4a');
  assert.equal(voiceRecordingExtension('audio/wave'), 'wav');
});
