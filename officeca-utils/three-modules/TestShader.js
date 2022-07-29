import {
	Vector2
} from './three.module.js';

//dithering shader for threejs

const SobelOperatorShader = {

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

        float random(vec2 p){
            return fract(cos(dot(p,vec2(23.14,2.665)))*12345.6789);
        }
        void main(){
            vec2 uv = gl_FragCoord.xy/resolution.xy;
            vec4 color = texture2D(tDiffuse,uv);
            float step_u = 1./resolution.x;
            float step_v = 1./resolution.y;
            vec4 cRight = texture2D(tDiffuse,uv+vec2(step_u, 0.0));
            vec4 cBottom = texture2D(tDiffuse,uv+vec2(0.0, step_v));
            float _dFdx = length(color-cRight)/step_u;
            float _dFdy = length(color-cBottom)/step_v;
            float g = sqrt(pow(_dFdx, 2.0) + pow(_dFdy, 2.0)) * 0.006;
            if(g > 0.4 && resolution.x > 350.0) {
                //color.rgb*=max(.5,1.-(resolution.x-350.)/500.);
                gl_FragColor = vec4(vec3(1.0), 1.0);
            } else {
                discard;
            };
            //color.rgb*=1.1-.8*(sqrt(pow(.5-uv.x,2.)+pow(.5-uv.y,2.)));
            //vec2 uvRandom=uv;
            //uvRandom.y*=random(vec2(uvRandom.y,1.));
            //add grain
            //color.rgb+=random(uvRandom)*.06;
            //gl_FragColor=color;
            // if (G / 2.0 < 0.0001) {
			// 	discard;
			// } else {
			// 	gl_FragColor = vec4(vec3(1.0), 1.0);
			// }
        }`

};

export { SobelOperatorShader };
