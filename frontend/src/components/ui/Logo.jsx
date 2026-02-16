// COMPANY LOGO COMPONENT

import logoImage from '../../assets/copycat_logo.jpeg';

const Logo = ({ size = 'md', className = '' }) => {
  const dimensions = {
    sm: 'h-8',   // 32px - for navbars
    md: 'h-10',  // 40px - default
    lg: 'h-12',  // 48px - for hero sections
  };

  return (
    <img 
      src={logoImage} 
      alt="Copy Cat Group" 
      className={`${dimensions[size]} w-auto ${className}`}
    />
  );
};

export default Logo;
