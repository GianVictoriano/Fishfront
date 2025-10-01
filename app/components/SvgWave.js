import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const SvgWave = ({ style, color = '#fff', height = 120 }) => (
  <Svg
    height={height}
    width="100%"
    viewBox={`0 0 1440 ${height}`}
    preserveAspectRatio="none"
    style={[{ width: '100%', height }, style]}
  >
    {/* Mask: top is filled, only the bottom curve is cut out */}
    <Path
      d={`M0,${height * 0.5} Q360,${height} 720,${height * 0.6} T1440,${height * 0.7} V${height} H0 Z`}
      fill={color}
    />
  </Svg>
);




export default SvgWave;
