'use strict';
class Vector {
  constructor (x = 0, y = 0) {
    this.x = x;
    this.y = y;
  };

  plus(vector) {
    if (vector instanceof Vector) {
      const x = this.x + vector.x,
          y = this.y + vector.y;
      return new Vector(x, y);

    }else{
      throw new Error('Можно прибавлять к вектору только вектор типа Vector');
    };
  };

  times(multiplier){
    const x = this.x * multiplier,
          y = this.y * multiplier;
    return new Vector(x, y);
  };
};

class Actor {
  constructor(pos = new Vector(), size = new Vector(1, 1), speed = new Vector()){
    if (pos instanceof Vector & size instanceof Vector & speed instanceof Vector) {
      this.pos = pos;
      this.size = size;
      this.speed = speed;
    }else{
      throw new Error('Один из аргументов не объект!');
    };   
  };

  act(){

  };

  get left() {
    return this.pos.x;
  };

  get top() {
    return this.pos.y;
  };

  get right() {
    return this.pos.x + this.size.x;
  };

  get bottom() {
    return this.pos.y + this.size.y;
  };

  get type() {
    return 'actor';
  };

  isIntersect(object){
    if (object instanceof Actor) {
      if (object === this |
       this.right <= object.left |
       this.left >= object.right |
       this.top >= object.bottom |
       this.bottom <= object.top) {
        return false;
      } else{
        return true;
      };
    }else{
      throw new Error('Передан не объект типа Actor!');
    };
  };

};

class Level {
  constructor(grid = [], actors = []){
    this.grid = grid;
    this.actors = actors;
    this.player = actors.find(actor => actor.type === 'player');
    if (grid.length === 0){
      this.height = this.width = grid.length;
    } else{
      this.height = grid.length;
      typeof(grid[0]) === 'object' ? this.width = grid[0].length : this.width = 0
    };
    this.status = null;
    this.finishDelay = 1;
  };

  isFinished(){
    return (this.status !== null & this.finishDelay < 0) ? true : false;
  };

  actorAt(actor){
    if (!actor instanceof Actor) {
      throw new Error('Передан не объект типа Actor!');
    } else if (actor === undefined) {
      throw new Error('Не передан аргумент!');
    };

    return this.actors.find(el => el.isIntersect(actor));
 
  };

  obstacleAt(pos, size) {
    if (!pos instanceof Vector | !size instanceof Vector) {
      throw new Error('Передан не объект типа Vector!');
    };
    
    const object = new Actor(pos, size);
    if (object.left < 0 | object.top < 0| object.right > this.width){
      return 'wall';
    } else if (object.bottom > this.height){
      return 'lava';
    }
    
    for (let y = Math.floor(object.top); y < Math.ceil(object.bottom); y++){
      for (let x = Math.floor(object.left); x < Math.ceil(object.right); x++){
        const cell = this.grid[y][x];
        if (cell) return cell;
      }
    }

  };

  removeActor(actorToRemove) {
    if (this.actors.includes(actorToRemove)){
      this.actors.splice(this.actors.indexOf(actorToRemove), 1);
    };
  };

  noMoreActors(type) {
    return !Boolean(this.actors.find(actor => {
      return actor.type === type;
    }));
  };

  playerTouched(type, object) {
    if (this.status === null){
      if (type === 'lava' | type === 'fireball'){
        this.status = 'lost';
      } else if (type === 'coin') {
        this.removeActor(object);
        if (this.noMoreActors('coin')) {
          this.status = 'won';
        };
      };
    };
  };
};

class LevelParser {
  constructor(actorsDict) {
    this.actorsDict = actorsDict;
  };

  actorFromSymbol(symb) {
    return symb === undefined ?  undefined : symb in this.actorsDict ? this.actorsDict[symb] : undefined;
  };

  obstacleFromSymbol(symb) {
    if (symb === 'x'){
      return 'wall';
    } else if (symb === '!'){
      return 'lava';
    } else{
      return undefined;
    };
  };

  createGrid(array) {
     return array.length === 0 ? [] : array.map(line => line.split('').map(cell => this.obstacleFromSymbol(cell)))
  };

  createActors(array) {
    if (array.length === 0 | this.actorsDict === undefined){
      return [];
    } else{
      const actors = [];
      array.forEach((line, y) => {
        const cells = line.split('');
        cells.forEach((cell, x) => {
          if (cell in this.actorsDict){
            const className = this.actorFromSymbol(cell);
            if (typeof(className) === 'function') {
              const actor = new className(new Vector (x, y))
              if (actor instanceof Actor){
                actors.push(actor);
              };
            };
          };
        });
      });
      return actors;
    };
  };

  parse(array) {
    this.grid = this.createGrid(array);
    this.actors = this.createActors(array);
    return new Level(this.grid, this.actors);
  };
};

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)){
    super(pos, new Vector(1, 1), speed)
  };

  get type() {
    return 'fireball';
  }; 

  getNextPosition(time = 1) { 
    const newX = this.pos.x + this.speed.x * time,
          newY = this.pos.y + this.speed.y * time;        
    return new Vector(newX, newY);
  };

  handleObstacle() {
    this.speed.x = -this.speed.x;
    this.speed.y = -this.speed.y;
  };

  act(time, level) {
    const newPosition = this.getNextPosition(time)
    level.obstacleAt(newPosition, this.size) ? this.handleObstacle() : this.pos = newPosition;
  };
};

class HorizontalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)){
    super(pos, new Vector(2, 0));
  };
};

class VerticalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)){
    super(pos, new Vector(0, 2));
  };
};

class FireRain extends Fireball {
  constructor(pos = new Vector(0, 0)){
    super(pos, new Vector(0, 3));
    this.startPos = pos;
  };

  handleObstacle() {
    this.pos = this.startPos;
  };
};

class Coin extends Actor {
  constructor(pos){
    if (pos){
      super(new Vector(pos.x, pos.y), new Vector(0.6, 0.6))
    }else {
      super(new Vector(), new Vector(0.6, 0.6))
    }
    this.startPos = this.pos
    this.pos.x += 0.2
    this.pos.y += 0.1
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * (2*Math.PI + 1)
  };

  get type() {
    return 'coin';
  };

  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  };

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  };

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return new Vector(this.startPos.x, this.startPos.y + this.getSpringVector().y);
  };

  act(time) {
    this.pos = this.getNextPosition(time);
  };
};

class Player  extends Actor {
  constructor(pos) {
    super(pos, new Vector (0.8, 1.5));
    this.pos.y -= 0.5
  };

  get type() {
    return 'player';
  };
};

const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin,
  '|': VerticalFireball,
  '=': HorizontalFireball
};

const parser = new LevelParser(actorDict);

loadLevels()
  .then(JSON.parse);
  .then(levels => runGame(levels, parser, DOMDisplay);
  .then(() => alert('Вы выиграли!')));
