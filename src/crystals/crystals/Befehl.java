/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package crystals;

import java.io.IOException;
import java.io.Serializable;

/**
 * 
 * @author Bernd
 */
public class Befehl implements Serializable
{
	String art;
	int x, y, x2, y2;

	public Befehl()
	{
	}

	private void writeObject(java.io.ObjectOutputStream stream) throws IOException
	{
		stream.writeInt(x);
		stream.writeInt(y);
		stream.writeInt(x2);
		stream.writeInt(y2);
		stream.writeObject(art);
	}

	private void readObject(java.io.ObjectInputStream stream) throws IOException,
			ClassNotFoundException
	{
		x = stream.readInt();
		y = stream.readInt();
		x2 = stream.readInt();
		y2 = stream.readInt();
		art = (String) (stream.readObject());
	}

	public Befehl(String art, int posx, int posy)
	{
		this.art = art;
		this.x = posx;
		this.y = posy;
	}

	public Befehl(String art, int x, int y, int x2, int y2)
	{
		this.art = art;

		if (x < x2)
		{
			this.x = x;
			this.x2 = x2;
		}

		this.x = x2;
		this.x2 = x;

		if (y < y2)
		{
			this.y = y;
			this.y2 = y2;
		}
		else
		{
			this.y = y2;
			this.y2 = y;
		}
	}

}
