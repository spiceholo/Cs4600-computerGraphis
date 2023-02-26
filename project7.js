// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	var MatrixRX = [
		1, 0, 0, 0,
		0, Math.cos(rotationX), -Math.sin(rotationX), 0,
		0, Math.sin(rotationX), Math.cos(rotationX), 0,
		0, 0, 0, 1
	];
	var MatrixRY = [
		Math.cos(rotationY), 0, Math.sin(rotationY), 0,
		0, 1, 0, 0,
		-Math.sin(rotationY), 0, Math.cos(rotationY), 0,
		0, 0, 0, 1
	];
	var trans2 = MatrixMult(trans, MatrixMult(MatrixRX, MatrixRY));
	var mvp = trans2;
	return mvp;
}


var VS = `
	attribute vec3 pos;
	attribute vec3 norm;
	attribute vec2 txc;
	uniform mat4 mvp;
	varying vec3 viewSpacePosition;
	varying vec2 texCoordinates;
	uniform bool swapAxes;
	uniform mat4 mv;
	uniform mat3 mNormal;
	varying vec3 viewSpaceNormal;
	void main()
	{
	    if(swapAxes)
	    {
	        gl_Position = mvp * vec4(pos.x,pos.z,pos.y,1);
		    texCoordinates = txc;
		    vec4 viewSpacePosition4 = mv * vec4(pos.x,pos.z,pos.y,1);
		    viewSpacePosition = normalize(vec3(viewSpacePosition4.x, viewSpacePosition4.y, viewSpacePosition4.z));
		    viewSpaceNormal = normalize(mNormal * vec3(norm.x, norm.z, norm.y));
	    }
	    else
	    {
	        gl_Position = mvp * vec4(pos,1);
		    texCoordinates = txc;
		    vec4 viewSpacePosition4 = mv * vec4(pos,1);
		    viewSpacePosition = normalize(vec3(viewSpacePosition4.x, viewSpacePosition4.y, viewSpacePosition4.z));
		    viewSpaceNormal = normalize(mNormal * norm);
	    }
	}
`;
var FS = `
	precision mediump float;
	
	uniform sampler2D tex;
	uniform vec3 light;
	uniform vec3 viewPos;
	uniform vec3 lightColor;
	uniform float alpha;
	varying vec2 texCoordinates;
	varying vec3 viewSpacePosition;
	varying vec3 viewSpaceNormal;
	uniform bool showTexture;
	uniform bool created;
	
	void main()
	{	
		vec3 h = normalize(viewPos + light);
		float diffuseCos = max(dot(viewSpaceNormal, light), 0.0);
		float specularCos = pow(max(dot(viewSpaceNormal, h), 0.0), alpha);
		vec3 diffuse = diffuseCos * lightColor;
		vec3 specular = specularCos * lightColor;
	    if(created && showTexture)
	    {
	    	vec4 textureColor = texture2D(tex, texCoordinates);
	    	vec3 result = (diffuse + specular) * vec3(textureColor.x, textureColor.y, textureColor.z);
	        gl_FragColor = vec4(result,1);
	    }
	    else 
	    {
	    	vec3 result = (diffuse + specular) * lightColor;
		    gl_FragColor = vec4(result,1);
		}
	}
`;
// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor() {
		this.prog = InitShaderProgram(VS, FS);
		this.mvp = gl.getUniformLocation(this.prog, 'mvp');
		this.texPos = gl.getAttribLocation(this.prog, 'txc');
		this.sampler = gl.getUniformLocation(this.prog, 'tex');
		this.normPos = gl.getAttribLocation(this.prog, 'norm');
		this.vertPos = gl.getAttribLocation(this.prog, 'pos');
		this.normalbuffer = gl.createBuffer();
		this.vertbuffer = gl.createBuffer();
		this.texturebuffer = gl.createBuffer();

		gl.useProgram(this.prog);
		gl.uniform1i(gl.getUniformLocation(this.prog, 'showTexture'), true);
		var white = [1.0, 1.0, 1.0];
		var viewPosition = [0.0, 0.0, 0.0];
		gl.uniform3fv(gl.getUniformLocation(this.prog, 'viewPos'), viewPosition);
		gl.uniform3fv(gl.getUniformLocation(this.prog, 'lightColor'), white);
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh(vertPos, texCoords, normals) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texturebuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		this.numTriangles = vertPos.length / 3;
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ(swap) {
		gl.useProgram(this.prog);
		gl.uniform1i(gl.getUniformLocation(this.prog, 'swapAxes'), swap);
	}
	
	// This method is called to draw the triangular mesh.
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw(matrixMVP, matrixMV, matrixNormal) {
		gl.useProgram(this.prog);
		gl.uniformMatrix4fv(this.mvp, false, matrixMVP);
		gl.uniformMatrix3fv(gl.getUniformLocation(this.prog, 'mNormal'), false, matrixNormal);
		gl.uniformMatrix4fv(gl.getUniformLocation(this.prog, 'mv'), false, matrixMV);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.vertexAttribPointer(this.vertPos, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.vertPos);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalbuffer);
		gl.vertexAttribPointer(this.normPos, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.normPos);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texturebuffer);
		gl.vertexAttribPointer(this.texPos, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.texPos);
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img) {
		gl.useProgram(this.prog);
		var texture = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

		gl.generateMipmap(gl.TEXTURE_2D);
		gl.uniform1i(this.sampler, 0);
		gl.uniform1i(gl.getUniformLocation(this.prog, 'created'), true);

		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture(show) {
		gl.useProgram(this.prog);
		gl.uniform1i(gl.getUniformLocation(this.prog, 'showTexture'), show);
	}

	
	// This method is called to set the incoming light direction
	setLightDir(x, y, z) {
		var lightDirection = [-x, -y, z];
		gl.useProgram(this.prog);
		gl.uniform3fv(gl.getUniformLocation(this.prog, 'light'), lightDirection);
	}
	
	// This method is called to set the shininess of the material
	setShininess(shininess) {
		gl.useProgram(this.prog);
		gl.uniform1f(gl.getUniformLocation(this.prog, 'alpha'), shininess);
	}
}


// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep( dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution )
{
	//Compute the total force of each particle
	var forces = Array(positions.length); 
	forces.fill(new Vec3(0, 0, 0));
	var G = gravity.mul(particleMass);
	for (let i = 0; i < forces.length; i++) {
		forces[i] = forces[i].add(G);
	}

	for (let j = 0; j < springs.length; j++) {
		let lengthR = springs[j].rest;
		let p0 = springs[j].p0;
		let p1 = springs[j].p1;
		
		let fp = positions[p0];
		let fv = velocities[p0];
		let sp = positions[p1];
		let sv = velocities[p1];

		let l = sp.sub(fp).len();
		let direction = (sp.sub(fp)).div(l);
		let springF = direction.mul(stiffness * (l - lengthR));
		let dampingF = direction.mul(damping * (sv.sub(fv)).dot(direction));

		forces[p0] = forces[p0].add(springF.add(dampingF));
		forces[p1] = forces[p1].sub(springF.add(dampingF));
	}

	//Update positions and velocities
	for (let k = 0; k < forces.length; k++) {
		let a = forces[k].div(particleMass);
		velocities[k].inc(a.mul(dt));
		positions[k].inc(velocities[k].mul(dt));
	}

	//Handle collisions
	for (let i = 0; i < positions.length; i++) {
		if (positions[i].x > 1) {
			velocities[i].x = -velocities[i].x * restitution;
			positions[i].x = 1 - (restitution * (positions[i].x - 1))
		} else if (positions[i].x < -1) {
			velocities[i].x = -velocities[i].x * restitution;
			positions[i].x = -1 + (restitution * (positions[i].x + 1))
		}

		if (positions[i].y > 1) {
			velocities[i].y = -velocities[i].y * restitution;
			positions[i].y = 1 - (restitution * (positions[i].y - 1))
		} else if (positions[i].y < -1) {
			velocities[i].y = -velocities[i].y * restitution;
			positions[i].y = -1 + (restitution * (positions[i].y + 1))
		}

		if (positions[i].z > 1) {
			velocities[i].z = -restitution * velocities[i].z;
			positions[i].z = 1 - (restitution * (positions[i].z - 1))
		} else if (positions[i].z < -1) {
			velocities[i].z = -restitution * velocities[i].z;
			positions[i].z = -1 + (restitution * (positions[i].z + 1))
		}
	}
}

