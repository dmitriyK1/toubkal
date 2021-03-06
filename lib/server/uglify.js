/*  uglify.js
    
    Minify javascript content using uglifyjs
    
    ----
    
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
"use strict";

var ugly         = require( 'uglify-js' )
  , rs           = require( '../core/pipelet.js' )
  , RS           = rs.RS
  , extend       = RS.extend
  , Transactions = RS.Transactions
  , Transaction  = Transactions.Transaction
  , Options      = Transactions.Options
  , Set          = RS.Set
  , path_to_uri  = RS.path_to_uri
  , log          = RS.log.bind( null, 'uglify' )
;

/* ----------------------------------------------------------------------------
   de&&ug()
*/
var de = false, ug = log;

function minified_path( source_path ){
  var parsed = path.parse( source_path );
  
  delete parsed.base;
  
  parsed.name += '-min';
  
  return path.format( parsed );
} // minified_path()

rs
  /* --------------------------------------------------------------------------
      @pipelet uglify_each( options )
      
      @short Minifies source files separately (unbundled)
      
      @parameters
      - **options** (Object): optional, pipelet alter() options plus uglify
        options:
        - **warnings** (Boolean): warn when dropping unsued code, see
          documentation of [UglifyJS 2](https://github.com/mishoo/UglifyJS2).
      
      @source
      - **path** (String): source file path
      - **uri** (String): optional, default is built as pipelet to_uri()
      - **content** (String or Object): source file content
      - **source_map** (String): source map from source file, as JSON String
        or Object
      - **ast** (String or Object): optional SpiderMonkey AST as JSON String
        or Object
      - **minified_path** (String): optional, the path of the minified file
      - **source_map_path** (String): optinal, the path of the emitted source
        source map file
      
      @emits
      All source attributes plus:
      - **ast** (Object): parsed JSON UglifyJS AST tree
      - **minified_path** (String): from source, or built by adding ```"-min"```
        to source ```"path"``` file name (before extention), e.g.
        ```"toubkal-min.js"```
      - **source_map_path** (String): from source or built by adding
        ```".map"``` to ```"minified_path"```, e,g, ```"toubkal-min.js.map"```
      - **source** (String): minified source code, if ```ast```
      - **source_map** (String): source map
      
      @description
      This is a @@stateless, @@greedy, @@synchronous pipelet.
      
  */
  .Compose( 'uglify_each', function( source, options ) {
    return source.alter( uglify_file, options );
    
    function uglify_file( file ) {
      var source_path     = file.path
        , source_uri      = file.uri || path_to_uri( source_path )
        , source_map      = file.source_map
        , content         = file.content
        , ast             = file.ast
        , name            = file.minified_path   = file.minified_path   || minified_path( source_path )
        , source_map_path = file.source_map_path = file.source_map_path || name + '.map'
      ;
      
      if( ast ) {
        // convert SpiderMonkey AST to uglify's AST
        ast = UglifyJS.AST_Node.from_mozilla_ast( ast );
      } else if( content ) {
        source_length += content.length;
        
        ast = ugly.parse( content, { filename: source_uri } );
      }
      
      file.ast = ast;
      
      if ( ast ) {
        // Compress
        ast.figure_out_scope();
        
        ast = ast.transform( ugly.Compressor( { warnings: options.warnings } ) );
        
        // Mangle
        ast.figure_out_scope();
        ast.compute_char_frequency();
        ast.mangle_names();
        
        // Output
        var map = ugly.SourceMap( { file: name, orig: source_map } );
        
        var code = ugly.OutputStream( { source_map: map } );
        
        ast.print( code );
        
        // Replaced @ by # out of concern for IE issues with conditional statements
        // Check uglify issue: https://github.com/mishoo/UglifyJS2/issues/310
        // Also check: https://code.google.com/p/dart/issues/detail?id=11195
        code.toString() + '\n//# sourceMappingURL=/' + source_map_path;
        
        map = map.toString();
        
        // Emit content as String Objects, to pass by reference potentially big strings
        file.source     = new String( code );
        file.source_map = new String( map  );
        
        var minified_length = code.length;
        
        de&&ug( 'name: '  + name
          + ', source length: '     + source_length
          + ', minified length: '   + minified_length
          + ' (' + Math.round( 100 * ( minified_length / source_length ) ) + '%)'
          + ', source map length: ' + map.length
          + ' (' + Math.round( 100 * ( map.length / source_length ) ) + '%)'
          + ', filepaths: ', filepaths
          //+ ', source map content: ' + map.substr( 0, 100 ) + ' ...'
        );
      } else {
        de&&ug( 'no content for name: ' + name );
      }
    } // uglify_file()
  } ) // uglify_each()
;

/* ----------------------------------------------------------------------------
    @pipelet uglify( location, options )
    
    @short Minifies source JavaScript assets, including source map
    
    @parameters
    - location (String): uri of minified asset, e.g.
      ```"lib/toubkal-min.js"```. Also used to build source map file
      location by adding ```".map"```.
      
    - options (Object): 
      - warnings (Boolean): warn when dropping unsued code, see
        documentation of [UglifyJS 2](https://github.com/mishoo/UglifyJS2).
    
    @description
    This pipelet minifies assets an generates source map on complete, using
    [UglifyJS 2](https://github.com/mishoo/UglifyJS2).
    
    This is a @@stateful, @@greedy, @@synchronous on complete pipelet.
*/
function Uglify( location, options ) {
  if ( ! location ) throw new Error( 'uglify(), undefined or empty location' );
  
  Set.call( this, [], options );
  
  this._location = location;
  this._source_map = location + '.map';
  
  // Last uglified content
  this._uglified = null;
  
  // Ongoing transaction for this location
  this._t = null;
  
  return this;
} // Uglify()

Uglify.default_options = function( location, options ) {
  return extend( {
    name       : location
  }, options );
} // Uglify.default_options()

Set.Build( 'uglify', Uglify, function( Super ) { return {
  _uglify: function( options ) {
    if ( Options.has_more( options ) ) return this;
    
    var that = this, filepaths = [], source_length = 0, ast;
    
    // Fetch files from source to get the files in order if these are ordered
    // this is because the order of assets is most of the time relevant
    // Use _input._fetch instead of _fetch because files to uglify are from the source while
    // uglify() adds uglified and source map files.
    
    this._input._fetch( function( files, no_more ) {
      try {
        // ToDo: allow incremental parsing, and use files' source maps
        // See https://github.com/tarruda/powerbuild/blob/master/src/bundle.coffee line #132
        // And https://github.com/tarruda/powerbuild/blob/master/src/traverse-dependencies.coffee line #108
        // Implement this as part of a new lower granularity pipeline
        for ( var i = -1, l = files.length; ++i < l; ) {
          var file = files[ i ], content = file.content;
          
          if ( content ) {
            filepaths.push( file.path );
            
            source_length += content.length;
            
            // ToDo: keep parsed ast for each file and re-parse only files which have changed
            ast = ugly.parse( content, { filename: file.uri || path_to_uri( file.path ), toplevel: ast } );
          }
        }
        
        if ( ! no_more ) return;
        
        var name = that._location, source_map = that._source_map;
        
        if ( ast ) {
          // Compress
          ast.figure_out_scope();
          
          var _options = that._options;
          
          ast = ast.transform( ugly.Compressor( { warnings: _options.warnings } ) );
          
          // Mangle
          ast.figure_out_scope();
          ast.compute_char_frequency();
          ast.mangle_names();
          
          // Output
          
          // ToDo: add support for input source maps using a method such as
          // https://github.com/edc/mapcat or when UglifyJS2 fixes this
          //
          // UglifyJS issues:
          //   - https://github.com/substack/node-browserify/issues/395
          //   - https://github.com/mishoo/UglifyJS2/issues/145
          //   - https://github.com/mishoo/UglifyJS2/issues/151
          // Another, perhaps better, option would be to develop a mapcat() pipelet use as a preprocessor to uglify()
          // because uglify can use a single input source map.
          // Note that mapcat does not supprot currenlty the mixing of compiled and non-compiled sources:
          //   - https://github.com/edc/mapcat/issues/6
                    
          var map = ugly.SourceMap( { file: name } );
          
          var code = ugly.OutputStream( { source_map: map } );
          
          ast.print( code );
          
          // Replaced @ by # out of concern for IE issues with conditional statements
          // Check uglify issue: https://github.com/mishoo/UglifyJS2/issues/310
          // Also check: https://code.google.com/p/dart/issues/detail?id=11195
          code = code.toString() + '\n//# sourceMappingURL=/' + source_map;
          
          map = map.toString();
          
          var minified_length = code.length;
          
          de&&ug( 'name: '  + name
            + ', source length: '     + source_length
            + ', minified length: '   + minified_length
            + ' (' + Math.round( 100 * ( minified_length / source_length ) ) + '%)'
            + ', source map length: ' + map.length
            + ' (' + Math.round( 100 * ( map.length / source_length ) ) + '%)'
            + ', filepaths: ', filepaths
            //+ ', source map content: ' + map.substr( 0, 100 ) + ' ...'
          );
        } else {
          de&&ug( 'no content for name: ' + name );
        }
        
        var previous = that._uglified
          , transaction = that._t
        ;
        
        if ( ast ) {
          that._uglified = [
            { path: name      , content: code },
            { path: source_map, content: map , mime_type: 'application/json' }
          ];
          
          if ( previous ) {
            transaction
              .add_operations( 1 )
              .__emit_remove( previous )
            ;
          }
          
          transaction.__emit_add( that._uglified );
        } else {
          that._uglified = null;
          
          if ( previous ) {
            transaction.__emit_remove( previous );
          } else {
            transaction.emit_nothing()
          }
        }
        
        transaction.end();
        
        // ToDo: remove the following assertion once automated test is provided
        if ( that._t ) throw new Error( 'transaction has not ended' );
      } catch( e ) {
        if ( i < l ) {
          log( 'error, file:', file.path, '- Error:' + e );
        } else {
          log( 'error:', e );
        }
        
        // ToDo: in production, trigger an alarm
        
        return this;
      }
    } );
    
    return this;
  }, // _uglify()
  
  _get_transaction: function( options ) {
    // ToDo: allow simultaneous independent transactions, using this._transactions
    var t = this._t;
    
    if ( t ) return t.add_operations( 1 ).set_source_options( options );
    
    return this._t = new Transaction( 2, options )
      .on( 'add'   , Super._add   , this )
      .on( 'remove', Super._remove, this )
      .on( 'ended', function() { this._t = null }, this )
    ;
  }, // _get_transaction()
  
  _add: function( files, options ) {
    this._get_transaction( options ).__emit_add( files );
    
    return this._uglify( options );
  }, // _add()
  
  _remove: function( files, options ) {
    this._get_transaction( options ).__emit_remove( files );
    
    return this._uglify( options );
  }, // _remove()
  
  _update: function( updates, options ) {
    this._get_transaction( options ).__emit_update( updates );
    
    return this._uglify( options );
  } // _update()
} } ); // Uglify instance methods

/* ----------------------------------------------------------------------------
   module exports
*/
RS.add_exports( {
  'Uglify': Uglify
} );

de&&ug( "module loaded" );
