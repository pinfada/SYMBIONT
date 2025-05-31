import React from 'react';

const Loader: React.FC<{size?: number}> = ({ size = 36 }) => (
  <div className="ext-loader" style={{ width: size, height: size, borderWidth: size/9 }} />
);

export default Loader; 