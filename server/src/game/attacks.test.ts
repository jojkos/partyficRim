import { describe, expect, it } from 'vitest';
import { RoomManager } from './rooms.js';
import { applyBombDamage, applySelfDamage, fireAttack, repairQuadrant } from './attacks.js';

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
    room.enemies.set('near', { id: 'near', pos: { x: room.robot.x + 35, y: room.robot.y - 35 }, vel: { x: 0, y: 0 } });
    room.enemies.set('far', { id: 'far', pos: { x: room.robot.x - 200, y: room.robot.y + 200 }, vel: { x: 0, y: 0 } });

    fireAttack(room, 'laser', 1, []);

    expect(room.enemies.has('near')).toBe(false);
    expect(room.enemies.has('far')).toBe(true);
  });
});

describe('applySelfDamage', () => {
  it('damages all quadrants equally without a shield', () => {
    const room = new RoomManager().createRoom();
    applySelfDamage(room, 10);
    expect(room.quadrantHp).toEqual({ 0: 90, 1: 90, 2: 90, 3: 90 });
  });

  it('reduces damage on the shielded quadrant to 20%', () => {
    const room = new RoomManager().createRoom();
    room.shieldQuadrant = 0;
    applySelfDamage(room, 10);
    expect(room.quadrantHp[0]).toBe(98); // 100 - round(10*0.2)
    expect(room.quadrantHp[1]).toBe(90);
  });

  it('triggers gameover when any quadrant reaches 0', () => {
    const room = new RoomManager().createRoom();
    room.quadrantHp[2] = 5;
    applySelfDamage(room, 10);
    expect(room.phase).toBe('gameover');
    expect(room.quadrantHp[2]).toBe(0);
  });
});

describe('repairQuadrant', () => {
  it('adds 5 hp to the specified quadrant', () => {
    const room = new RoomManager().createRoom();
    room.quadrantHp[1] = 50;
    repairQuadrant(room, 1);
    expect(room.quadrantHp[1]).toBe(55);
  });

  it('clamps at 100', () => {
    const room = new RoomManager().createRoom();
    room.quadrantHp[0] = 98;
    repairQuadrant(room, 0);
    expect(room.quadrantHp[0]).toBe(100);
  });
});

describe('fireAttack — laser', () => {
  it('laser applies self-damage of 25 to all quadrants', () => {
    const room = new RoomManager().createRoom();
    room.phase = 'playing';
    fireAttack(room, 'laser', 0, []);
    expect(room.quadrantHp).toEqual({ 0: 75, 1: 75, 2: 75, 3: 75 });
  });
});

describe('fireAttack — bomb', () => {
  it('bomb creates a fuse entry in room.bombs', () => {
    const room = new RoomManager().createRoom();
    room.phase = 'playing';
    fireAttack(room, 'bomb', 2, []);
    expect(room.bombs.length).toBe(1);
    expect(room.bombs[0]!.fuseMsRemaining).toBeGreaterThan(0);
    expect(room.bombs[0]!.pos).toEqual({ x: room.robot.x, y: room.robot.y });
  });
});

