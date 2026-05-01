import { describe, expect, it } from 'vitest';
import { RoomManager } from './rooms.js';
import { applyBombDamage, fireAttack } from './attacks.js';

describe('attacks', () => {
  it('rotary damages only the shielded target quadrant when fired into a shield', () => {
    const room = new RoomManager().createRoom();
    room.phase = 'playing';
    room.shieldQuadrant = 1;

    fireAttack(room, 'rotary', 1, []);

    expect(room.quadrantHp[0]).toBe(100);
    expect(room.quadrantHp[1]).toBe(98);
    expect(room.quadrantHp[2]).toBe(100);
    expect(room.quadrantHp[3]).toBe(100);
  });

  it('rotary does not self-damage when fired away from the shield', () => {
    const room = new RoomManager().createRoom();
    room.phase = 'playing';
    room.shieldQuadrant = 1;

    fireAttack(room, 'rotary', 2, []);

    expect(room.quadrantHp).toEqual({ 0: 100, 1: 100, 2: 100, 3: 100 });
  });

  it('bomb damage only applies while the robot is inside the explosion radius', () => {
    const room = new RoomManager().createRoom();
    room.phase = 'playing';
    const bombPos = { x: room.robot.x, y: room.robot.y };
    room.robot.x += 101;

    applyBombDamage(room, bombPos);
    expect(room.quadrantHp).toEqual({ 0: 100, 1: 100, 2: 100, 3: 100 });

    room.robot.x = bombPos.x + 40;
    applyBombDamage(room, bombPos);
    expect(room.quadrantHp).toEqual({ 0: 50, 1: 50, 2: 50, 3: 50 });
  });

  it('bomb damage applies to all quadrants and is reduced on the shielded quadrant', () => {
    const room = new RoomManager().createRoom();
    room.phase = 'playing';
    room.shieldQuadrant = 2;

    applyBombDamage(room, { x: room.robot.x + 99, y: room.robot.y });

    expect(room.quadrantHp).toEqual({ 0: 50, 1: 50, 2: 90, 3: 50 });
  });

  it('attack visuals keep all selected core colors', () => {
    const room = new RoomManager().createRoom();
    room.phase = 'playing';

    fireAttack(room, 'melee', 0, ['red', 'cyan', 'pink']);

    expect(room.attacks[0]?.colors).toEqual(['#ff4d5e', '#4ce6ff', '#ff6fd8']);
  });

  it('kills static enemies inside weapon hitboxes', () => {
    const room = new RoomManager().createRoom();
    room.phase = 'playing';
    room.enemies.set('near', { id: 'near', pos: { x: room.robot.x + 35, y: room.robot.y - 35 } });
    room.enemies.set('far', { id: 'far', pos: { x: room.robot.x - 200, y: room.robot.y + 200 } });

    fireAttack(room, 'laser', 1, []);

    expect(room.enemies.has('near')).toBe(false);
    expect(room.enemies.has('far')).toBe(true);
  });
});
