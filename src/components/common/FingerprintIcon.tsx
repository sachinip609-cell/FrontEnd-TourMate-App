import React from 'react';
import { View } from 'react-native';
import { Colors } from '../../theme';

interface FingerprintIconProps {
  size?: number;
  color?: string;
}

const FingerprintIcon: React.FC<FingerprintIconProps> = ({
  size = 34,
  color = Colors.primary,
}) => {
  // Each scale produces one ridge arc (top half of a circle = arch shape ⌒)
  const arcScales = [0.22, 0.4, 0.58, 0.76, 0.94];

  return (
    <View style={{ width: size, height: size }}>
      {/* Central ridge dot */}
      <View
        style={{
          position: 'absolute',
          width: 3.5,
          height: 3.5,
          borderRadius: 2,
          backgroundColor: color,
          left: (size - 3.5) / 2,
          top: (size - 3.5) / 2,
        }}
      />

      {arcScales.map((scale, index) => {
        const arcSize = size * scale;
        const left = (size - arcSize) / 2;
        const top = (size - arcSize / 2) / 2;

        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              left,
              top,
              width: arcSize,
              height: arcSize / 2,
              overflow: 'hidden',
            }}
          >
            {/* Full circle — overflow clips it to show only the top half */}
            <View
              style={{
                width: arcSize,
                height: arcSize,
                borderRadius: arcSize / 2,
                borderWidth: 1.5,
                borderColor: color,
                backgroundColor: 'transparent',
              }}
            />
          </View>
        );
      })}
    </View>
  );
};

export default FingerprintIcon;
