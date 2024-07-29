import {
	Vector2
} from './three.module.js';

//dithering shader for threejs

const ASCIIShader = {

	uniforms: {

		'tDiffuse': { value: null },
		'resolution': { value: new Vector2() }

	},

	vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`

		uniform sampler2D tDiffuse;
		uniform vec2 resolution;
		varying vec2 vUv;

		// uniform sampler2D tex0;
		// uniform sampler2D tex1;
		// uniform vec2 uResolution;
		// uniform float pixel;
		// uniform bool inv;
		// varying vec4 vColor;
		// varying vec2 tc;
		// varying vec2 vUv;
		
		//bitmap drawing adapted from iq https://www.shadertoy.com/view/4dfXWj
		//#define P(id,a,b,c,d,e,f,g,h) if( id == int(pos.y) ){ int pa = a+2*(b+2*(c+2*(d+2*(e+2*(f+2*(g+2*(h))))))); cha = floor(mod(float(pa)/pow(2.,float(pos.x)),2.)); }
		
		// "steps" of R, G and B. Must be integer && equal or greater than 2
		float rcount = 4.0;
		float gcount = 4.0;
		float bcount = 4.0;
		float acount = 1.0;
		
		float bayer[16];
		
		const float bayerSize = 4.0;
		float bayerDivider = bayerSize * bayerSize;
		
		
		vec4 nearestColor(vec4 incolor) {
				vec4 rgbaCounts = vec4(rcount, gcount, bcount, acount);
		
				vec4 color = incolor;
		
				color.r = (floor((rgbaCounts.r - 1.0) * color.r + 0.5) / (rgbaCounts.r - 1.0));
				color.g = (floor((rgbaCounts.g - 1.0) * color.g + 0.5) / (rgbaCounts.g - 1.0));
				color.b = (floor((rgbaCounts.b - 1.0) * color.b + 0.5) / (rgbaCounts.b - 1.0));
				color.a = 1.0;
				float newcolor = length(color.rgb * vec3(0.2126,0.7152,0.0722));
				//0.2126,0.7152,0.0722
				vec4 grey = vec4(newcolor, newcolor, newcolor, 1.0);
		
				return color;
		}
		
		float indexValue(int idx) {
				int x = int(mod(gl_FragCoord.x, 4.0));
				int y = int(mod(gl_FragCoord.y, 4.0));
		
				if(x < 8){
					if (idx == 0) return bayer[0] / 16.0;
					if (idx == 1) return bayer[1] / 16.0;
					if (idx == 2) return bayer[2] / 16.0;
					if (idx == 3) return bayer[3] / 16.0;
					if (idx == 4) return bayer[4] / 16.0;
					if (idx == 5) return bayer[5] / 16.0;
					if (idx == 6) return bayer[6] / 16.0;
					if (idx == 7) return bayer[7] / 16.0;
					if (idx == 8) return bayer[8] / 16.0;
					if (idx == 9) return bayer[9] / 16.0;
					if (idx == 10) return bayer[10] / 16.0;
					if (idx == 11) return bayer[11] / 16.0;
					if (idx == 12) return bayer[12] / 16.0;
					if (idx == 13) return bayer[13] / 16.0;
					if (idx == 14) return bayer[14] / 16.0;
					if (idx == 15) return bayer[15] / 16.0;
		
				}
		}
		
		float P(int id, ivec2 pos, int a,int b,int c,int d,int e,int f,int g,int h) {
			if(id == int(pos.y)){
				//binary conversion
				int idx = a+2*(b+2*(c+2*(d+2*(e+2*(f+2*(g+2*(h)))))));
				//if (inv) {
					return 1.0 - floor(mod(float(idx)/pow(2.,float(pos.x)),2.));
				//} else {
				//	return floor(mod(float(idx)/pow(2.,float(pos.x)),2.));
				//}
			} else {
				return 0.0;
				//return (texture2D(tDiffuse, floor(gl_FragCoord.xy / 8.0) / (resolution.xy / 8.0)).rgb);
			}
		}
		
		float greyscale(vec3 color, float strength) {
				float g = dot(color, vec3(0.299, 0.587, 0.114));
				return g * strength;
		}
		
		void main(void) {
			//0,  8,  2,  10, 12, 4,  14, 6, 3,  11, 1,  9, 15, 7,  13, 5
			bayer[0] = 0.0;
			bayer[1] = 8.0;
			bayer[2] = 2.0;
			bayer[3] = 10.0;
			bayer[4] = 12.0;
			bayer[5] = 4.0;
			bayer[6] = 14.0;
			bayer[7] = 6.0;
			bayer[8] = 3.0;
			bayer[9] = 11.0;
			bayer[10] = 1.0;
			bayer[11] = 9.0;
			bayer[12] = 15.0;
			bayer[13] = 7.0;
			bayer[14] = 13.0;
			bayer[15] = 5.0;
		
		
			// create texture coordinates based on pixelSize //
			//vec2 uv = gl_FragCoord.xy / resolution.xy;
			//uv.y = 1.0 - uv.y;
			vec2 uv = vUv;
		
			//width of pixel region in texture coordinates. changes the dither dot size.
			float dotSize = 8.0;
			//pixel region number using the texture coordinates
			vec2 pixelBin = gl_FragCoord.xy / dotSize;
		
			//add step to incolor to downscale pixelate uvs (bin)
			vec2 tiles = resolution.xy / dotSize;
			vec2 uvBin = floor(pixelBin) / tiles;
			
			//bitmap tex coords, every 8th pixel x, y
			ivec2 pos = ivec2(mod(pixelBin.x*8.0, 8.0), mod(pixelBin.y*8.0, 8.0));
		
			// get the image as a vec4 using texture2D and plug in our distored uv's
			vec4 inColor = texture2D(tDiffuse, uvBin);
			
			vec2 entry = mod(pixelBin.xy, vec2(bayerSize, bayerSize));
			int idx = int(entry.y) * int(bayerSize) + int(entry.x);
			
			float c = 1.0;
			
			vec3 rgb = (nearestColor(vec4(inColor.rgb, 1.0) + 6.5 * (indexValue(idx) / bayerDivider)).rgb);
			
			float g = greyscale(rgb.rgb, 1.5);
		
			if( g < .1 ) // .
			{
					c += P(7,pos,0,0,0,0,0,0,0,0);
					c += P(6,pos,0,0,0,0,0,0,0,0);
					c += P(5,pos,0,0,0,0,0,0,0,0);
					c += P(4,pos,0,0,0,0,0,0,0,0);
					c += P(3,pos,0,0,0,0,0,0,0,0);
					c += P(2,pos,0,0,0,1,1,0,0,0);
					c += P(1,pos,0,0,0,1,1,0,0,0);
					c += P(0,pos,0,0,0,0,0,0,0,0);
			}
			else if( g < .2 ) // :
			{
					c += P(7,pos,0,0,0,0,0,0,0,0);
					c += P(6,pos,0,0,0,0,0,0,0,0);
					c += P(5,pos,0,0,0,1,1,0,0,0);
					c += P(4,pos,0,0,0,0,0,0,0,0);
					c += P(3,pos,0,0,0,0,0,0,0,0);
					c += P(2,pos,0,0,0,1,1,0,0,0);
					c += P(1,pos,0,0,0,0,0,0,0,0);
					c += P(0,pos,0,0,0,0,0,0,0,0);
			}
			else if( g < .3 ) // -
			{
					c += P(7,pos,0,0,0,0,0,0,0,0);
					c += P(6,pos,0,0,0,0,0,0,0,0);
					c += P(5,pos,0,0,0,0,0,0,0,0);
					c += P(4,pos,0,1,1,1,1,1,1,0);
					c += P(3,pos,0,0,0,0,0,0,0,0);
					c += P(2,pos,0,0,0,0,0,0,0,0);
					c += P(1,pos,0,0,0,0,0,0,0,0);
					c += P(0,pos,0,0,0,0,0,0,0,0);
			}
			else if( g < .4 ) // =
			{
				c += P(7,pos,0,0,0,0,0,0,0,0);
				c += P(6,pos,0,0,0,0,0,0,0,0);
				c += P(5,pos,0,1,1,1,1,1,1,0);
				c += P(4,pos,0,0,0,0,0,0,0,0);
				c += P(3,pos,0,1,1,1,1,1,1,0);
				c += P(2,pos,0,0,0,0,0,0,0,0);
				c += P(1,pos,0,0,0,0,0,0,0,0);
				c += P(0,pos,0,0,0,0,0,0,0,0);
			}
			else if( g < .5 ) // +
			{
				c += P(7,pos,0,0,0,0,0,0,0,0);
				c += P(6,pos,0,0,0,1,1,0,0,0);
				c += P(5,pos,0,0,0,1,1,0,0,0);
				c += P(4,pos,1,1,1,1,1,1,1,1);
				c += P(3,pos,0,0,0,1,1,0,0,0);
				c += P(2,pos,0,0,0,1,1,0,0,0);
				c += P(1,pos,0,0,0,0,0,0,0,0);
				c += P(0,pos,0,0,0,0,0,0,0,0);
			}
			else if(g < .6 ) // *
			{
				c += P(7,pos,0,0,0,0,0,0,0,0);
				c += P(6,pos,0,1,1,0,0,1,1,0);
				c += P(5,pos,0,0,1,1,1,1,0,0);
				c += P(4,pos,1,1,1,1,1,1,1,1);
				c += P(3,pos,0,0,1,1,1,1,0,0);
				c += P(2,pos,0,1,1,0,0,1,1,0);
				c += P(1,pos,0,0,0,0,0,0,0,0);
				c += P(0,pos,0,0,0,0,0,0,0,0);
			}
			else if(g < .7 ) // #
			{
				c += P(7,pos,0,1,1,0,0,1,1,0);
				c += P(6,pos,0,1,1,0,0,1,1,0);
				c += P(5,pos,1,1,1,1,1,1,1,1);
				c += P(4,pos,0,1,1,0,0,1,1,0);
				c += P(3,pos,1,1,1,1,1,1,1,1);
				c += P(2,pos,0,1,1,0,0,1,1,0);
				c += P(1,pos,0,1,1,0,0,1,1,0);
				c += P(0,pos,0,0,0,0,0,0,0,0);
			}
			else if(g < .8 ) // %
			{
				c += P(7,pos,0,1,1,0,0,0,1,0);
				c += P(6,pos,0,1,1,0,0,1,1,0);
				c += P(5,pos,0,0,0,0,1,1,0,0);
				c += P(4,pos,0,0,0,1,1,0,0,0);
				c += P(3,pos,0,0,1,1,0,0,0,0);
				c += P(2,pos,0,1,1,0,0,1,1,0);
				c += P(1,pos,0,1,0,0,0,1,1,0);
				c += P(0,pos,0,0,0,0,0,0,0,0);
			}
			else if(g < .9 ) // @
			{
				c += P(7,pos,0,0,1,1,1,1,0,0);
				c += P(6,pos,0,1,1,0,0,1,1,0);
				c += P(5,pos,0,1,1,0,1,1,1,0);
				c += P(4,pos,0,1,1,0,1,1,1,0);
				c += P(3,pos,0,1,1,0,0,0,0,0);
				c += P(2,pos,0,1,1,0,0,0,1,0);
				c += P(1,pos,0,0,1,1,1,1,0,0);
				c += P(0,pos,0,0,0,0,0,0,0,0);
			}
			else // 0
			{
				c += P(7,pos,0,0,1,1,1,1,0,0);
				c += P(6,pos,0,1,1,0,0,1,1,0);
				c += P(5,pos,0,1,1,0,1,1,1,0);
				c += P(4,pos,0,1,1,1,0,1,1,0);
				c += P(3,pos,0,1,1,0,0,1,1,0);
				c += P(2,pos,0,1,1,0,0,1,1,0);
				c += P(1,pos,0,0,1,1,1,1,0,0);
				c += P(0,pos,0,0,0,0,0,0,0,0);
			}
			
			if (c == 1.0) {
				gl_FragColor = vec4(vec3(0.0), 1.0);
			} else {
				gl_FragColor = vec4(vec3(inColor.rgb), 1.0);
			}
			
			//gl_FragColor = vec4((inColor.rgb), 1.0);
		
		}
	`

};

export { ASCIIShader };
