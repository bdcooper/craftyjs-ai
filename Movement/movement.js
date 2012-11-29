Crafty.sprite(1, "images/ZHWUTFNU4P3PHT12/facing-trans.png", {
    face: [0, 0]
});
Crafty.sprite(1, "images/ZHWUTFNU4P3PHT12/facing-red-trans.png", {
    face_red: [0, 0]
});

Crafty.c("Vector",{
	_vector:{x:0,y:0},
	init:function(){
		return this;
	},
	vector:function(x,y){
	    this._vector = {x:x,y:y};
        return this;
    },
	magnitude:function(x,y){
		if(x === undefined){ x = this._vector.x;}
		if(y === undefined){ y = this._vector.y;}
	   return Math.sqrt((x * x) + (y * y));
    }
});

Crafty.c("Velocity",{
	_velocity:this._vector,
	_rotation:0,
    _time:1.0,
	_maxSpeed: 2.8,
    init:function(){
        var viewport = Crafty.viewport.rect();
        this.requires("Vector").bind("EnterFrame");
        this.bind("EnterFrame", function () {

            // updates position according to current velocity wrapped for toroid
            this.attr({x : (viewport._w + this.x + this._velocity.x * this._time) % viewport._w,
                       y : (viewport._h + this.y + this._velocity.y * this._time) % viewport._h});

            // TODO non-toroidal ... consider whether we have bounce on edges?

			// orient in direction of travel
			this.rotation = this.getNewOrientation();

        });
        return this;
    },
	steering: function(x, y) {
		this._velocity = {x:x,y:y};
        return this;
    },
    velocity: function(x,y,rotation){
	    this.steering(x,y);
	    this._rotation = rotation;
        return this;
    },
	time: function(time) {
		this._time = time;
        return this;
    },
    getNewOrientation: function() {
        var newOrientation = this._rotation;
        // Make sure we have a velocity (if not just return current orientation)
        if (this.magnitude() !== 0){
          // Calculate orientation using an arc tangent of
          // the velocity components. 
          newOrientation = (Math.atan2(this._velocity.y,this._velocity.x) * 180.0/ Math.PI) + 90.0;
        }
        return newOrientation;
    },
    maxSpeed: function(maxSpeed) {
        this._maxSpeed = maxSpeed;
        return this;
    }
});

Crafty.c("Seek", {
	_target: null,
	_targetVector: {x:0,y:0},
	_radius: 1,
	_timeToTarget: 4,
	_targetDistanceVector: {x:0,y:0},
	_targetAltDistanceVector: {x:0,y:0},
	_steeringVector: {x:0,y:0},
	setTargetVector: function() {
	    // default seek behaviour (not flee point)
	    return {x:this._target.x,y:this._target.y};
	},
	setTargetDistanceVector: function() {
	    // default seek behaviour (not flee distance)
	    return {x:this._targetVector.x - this.x,y:this._targetVector.y - this.y};	
	},
	steeringVectorInit: function() {
	    // default seek behaviour (not flee distance)
	    return {x:this._targetDistanceVector.x,y:this._targetDistanceVector.y};	
	},
	updateSteeringVector: function() {
		// default to non-toroidal seek
		return this.steeringVectorInit();
	},
	arrived: function(length) {
	    return length < this._radius;
	},
	arrival: function() {
	    // default is closing in on a single point, appropriate for seek and flee to point	
		var length = this.magnitude(this._steeringVector.x,this._steeringVector.y);
		
		// Check if we’re within radius
	    if(this.arrived(length)){
		
			// We can return no steering request
            this.steering(0,0);
		}
		else
		{
			// We need to move to our target, we’d like to
			// get there in timeToTarget seconds
			this._steeringVector.x = this._steeringVector.x / this._timeToTarget;
			this._steeringVector.y = this._steeringVector.y / this._timeToTarget;

            length = this.magnitude(this._steeringVector.x,this._steeringVector.y);
			// normalize
		
			if(length > this._maxSpeed)
			{
				this._steeringVector.x = this._steeringVector.x / length;
				this._steeringVector.y = this._steeringVector.y / length;

				// switch to max speed

				this._steeringVector.x *= this._maxSpeed;
				this._steeringVector.y *= this._maxSpeed;
			}

			// output steering
		
			this.steering(this._steeringVector.x,this._steeringVector.y);
		}
	},
    init: function() {
        var viewport = Crafty.viewport.rect();
        this.requires("Velocity").bind("EnterFrame");
        this.bind("EnterFrame", function() {
            if(this._target){
				var viewport = Crafty.viewport.rect();
				
				this._targetVector = this.setTargetVector();
				
				this._targetDistanceVector = this.setTargetDistanceVector();

				this._steeringVector = this.updateSteeringVector();
				
                this.arrival();
            }
        });
        return this;
    },
    seek: function(target) {
        this._target = target;
        return this;
    },
    radius: function(radius) {
        this._radius = radius;
        return this;
    },
    timeToTarget: function(timeToTarget) {
        this._timeToTarget = timeToTarget;
        return this;
    }
});

Crafty.c("Toroidal", {		
	updateSteeringVector: function() {
		var steeringVector = this.steeringVectorInit();
		// calculates the alternate toroidal distances
		var viewport = Crafty.viewport.rect();
		this._targetAltDistanceVector.x = (viewport._w - Math.abs(this._targetDistanceVector.x)) * - this._targetDistanceVector.x/Math.abs(this._targetDistanceVector.x);
        this._targetAltDistanceVector.y = (viewport._h - Math.abs(this._targetDistanceVector.y)) * - this._targetDistanceVector.y/Math.abs(this._targetDistanceVector.y);

        // prefers steering across shortest path given toroid
       if(Math.abs(this._targetAltDistanceVector.x) < Math.abs(this._targetDistanceVector.x)){
		    steeringVector.x = this._targetAltDistanceVector.x; 
		}
		if(Math.abs(this._targetAltDistanceVector.y) < Math.abs(this._targetDistanceVector.y)){
		    steeringVector.y = this._targetAltDistanceVector.y; 
		}	
		return steeringVector;
	},
    init: function() {
	    this.requires("Seek").bind("EnterFrame");
	    return this;
	}
});

Crafty.c("FleePoint", {		
	// this assumes we are fleeing to a point on a toroid
	_fleePoint: {x:0,y:0},
	setTargetVector: function() {
		// given a toroid can think of a flee point we are trying to move towards that 
        // is the furthest point on the toroid from the target ...
        var viewport = Crafty.viewport.rect();
		this._fleePoint.x = (this._target.x + viewport._w/2) % viewport._w; 
        this._fleePoint.y = (this._target.y + viewport._h/2) % viewport._h;
	    return {x:this._fleePoint.x,y:this._fleePoint.y};	
	},
    init: function() {
	    this.requires("Toroidal").bind("EnterFrame");
	    return this;
	}
});
	
Crafty.c("Flee", {
	setTargetDistanceVector: function() {
	    // gives flee distance
	    return {x:this.x - this._targetVector.x ,y: this.y - this._targetVector.y};	
	},
	arrived: function(length) {
		var viewport = Crafty.viewport.rect();
	    return ((length + 20) >= this.magnitude(viewport._w/2, viewport._h/2));
	},
    init: function() {
	    this.requires("Seek").bind("EnterFrame");
	    return this;
	}
});

Crafty.c("Wander", {
	_maxRotation: 5,
	getNewOrientation: function() {
        var newOrientation = this._rotation + (Math.random() - Math.random()) * this._maxRotation;
        var vx = Math.sin(newOrientation * (Math.PI/180)) * this._maxSpeed;
        var vy = -Math.cos(newOrientation * (Math.PI/180)) * this._maxSpeed;
		this.steering(vx,vy);
        return newOrientation;
    },
    init: function() {
	    this.requires("Velocity").bind("EnterFrame");
	    return this;
	}
});

Crafty.c("RandomPosition", {
	init: function() {
		this.attr({ x: Crafty.math.randomInt(50,350), y: Crafty.math.randomInt(50,350), rotation: 0});
	}
});

var target = Crafty.e("2D, DOM, Twoway, RandomPosition, Vector, Velocity, Wander, face_red, HTML").twoway(3).attr({w: 31, h: 42}).origin(15,35).velocity(-1,-2,0);
//var character = Crafty.e("2D, DOM, Twoway, RandomPosition, Vector, Velocity, face, Seek, HTML").twoway(3).attr({w: 31, h: 42}).origin(15,30).velocity(0,0,0).seek(target);
//var character2 = Crafty.e("2D, DOM, Twoway, RandomPosition, Vector, Velocity, face, Seek, Toroidal, HTML").twoway(3).attr({w: 31, h: 42}).origin(15,30).velocity(0,0,0).seek(target);
//var character3 = Crafty.e("2D, DOM, Twoway, RandomPosition, Vector, Velocity, face, Seek, Toroidal, FleePoint, HTML").twoway(3).attr({w: 31, h: 42}).origin(15,30).velocity(0,0,0).seek(target);
//var character4 = Crafty.e("2D, DOM, Twoway, RandomPosition, Vector, Velocity, face, Seek, Toroidal, Flee, HTML").twoway(3).attr({w: 31, h: 42}).origin(15,30).velocity(0,0,0).seek(target);
//var character5 = Crafty.e("2D, DOM, Twoway, RandomPosition, Vector, Velocity, face, Seek, Flee, HTML").twoway(3).attr({w: 31, h: 42}).origin(15,30).velocity(0,0,0).seek(target);