/*  url_pattern.js
    
    Copyright (c) 2013-2016, Reactive Sets

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
( this.undefine || require( 'undefine' )( module, require ) )()
( 'url_pattern', [ '../core/pipelet', [ 'UrlPattern', 'url-pattern' ] ], function( rs, Url_Pattern ) {
  'use strict';
  
  var RS     = rs.RS
    , extend = RS.extend
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = RS.log.bind( null, 'url pattern' );
  
  /* -------------------------------------------------------------------------------------------
     source.url_pattern( attribute, pattern, options )
     
     Match pattern against string from input.
     
     Emit the extracted values if it matches or an empty value ( {} ) otherwise.
     
     For details: https://github.com/snd/url-pattern
     
     This is a synchronous, stateless, greedy pipelet
     
     Parameters:
     - attribute        (String): name of the attribute to parse
     - pattern (String or Array): pattern to match
     - options          (Object): optional object
     
     If the pattern is an array, it first element must be a reagular expression. 
     The rest of the array elements are the names of the captured value
     
     Example: ( form test/src/url_pattern.coffee)
     
       rs
         .set( [ { content: '/api/users/10' } ] )
         
         .url_pattern( 'content', '/api/users/:id' )
       ;
       
     - output: { content: '/api/users/10', id: 10 }
     
  */
  var toString = Object.prototype.toString;
  
  rs.Compose( 'url_pattern', function( source, attribute, pattern, options ) {
    // throw an error if attribute is not defined
    if( ! attribute ) error( 'attribute parameter not defined' );
    
    var type = toString.call( pattern );
    
    switch( type ) {
      case '[object Array]'  :
        var regexp = pattern[ 0 ];
        
        if( toString.call( regexp ) === '[object RegExp]' ) {
          pattern = new Url_Pattern( regexp, pattern.slice( 1 ) );
        } else {
          error( 'first element of Array must be a regular expression, found: ' + toString.call( regexp ) );
        }
      break;
      
      case '[object String]' :
        pattern = new Url_Pattern( pattern, options );
      break;
      
      default: error( 'pattern must be a String or Array, found: ' + type );
    } // switch()
    
    return source
      .map( function( value ) {
        var v = pattern.match( value[ attribute ] );
        
        return v ? extend( {}, value, v ) : {};
      } )
    ;
    
    function error( m ) {
      throw new Error( 'url_pattern(), error: ' + m );
    } // error
  } ); // url_pattern()
  
  de&&ug( "module loaded" );
  
  return rs;
} ); // url_pattern.js
