declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { ComponentType } from 'react';
  import { TextProps } from 'react-native';

  interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }

  const Icon: ComponentType<IconProps>;
  export default Icon;
}

declare module 'react-native-vector-icons/*' {
  import { ComponentType } from 'react';
  import { TextProps } from 'react-native';

  interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }

  const Icon: ComponentType<IconProps>;
  export default Icon;
}
